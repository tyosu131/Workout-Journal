/** @jest-environment node */

import type { NextApiRequest, NextApiResponse } from "next";
import proxyHandler from "../../pages/api/[...proxyPath]";

type MockResponse = NextApiResponse & {
  status: jest.Mock;
  json: jest.Mock;
  send: jest.Mock;
  setHeader: jest.Mock;
};

const createRequest = (
  proxyPath: string[],
  overrides: Partial<NextApiRequest> = {}
) => ({
  method: "GET",
  query: { proxyPath },
  headers: {},
  url: `/api/${proxyPath.join("/")}`,
  ...overrides,
} as NextApiRequest);

const createResponse = (): MockResponse => {
  const response = {
    status: jest.fn(),
    json: jest.fn(),
    send: jest.fn(),
    setHeader: jest.fn(),
  } as unknown as MockResponse;
  response.status.mockReturnValue(response);
  response.json.mockReturnValue(response);
  response.send.mockReturnValue(response);
  return response;
};

const createUpstreamResponse = ({
  status = 200,
  body = '{"ok":true}',
  contentType = "application/json; charset=utf-8",
  cookies = [],
}: {
  status?: number;
  body?: string;
  contentType?: string | null;
  cookies?: string[];
} = {}) => {
  const bytes = new TextEncoder().encode(body);
  return {
    status,
    headers: {
      get: jest.fn((name: string) => name === "content-type" ? contentType : null),
      getSetCookie: jest.fn(() => cookies),
    },
    arrayBuffer: jest.fn().mockResolvedValue(bytes.buffer),
  };
};

describe("same-origin API proxy", () => {
  const originalBackendUrl = process.env.BACKEND_INTERNAL_URL;

  beforeEach(() => {
    process.env.BACKEND_INTERNAL_URL = "https://backend.internal.example";
    global.fetch = jest.fn().mockResolvedValue(createUpstreamResponse());
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
    if (originalBackendUrl === undefined) {
      delete process.env.BACKEND_INTERNAL_URL;
    } else {
      process.env.BACKEND_INTERNAL_URL = originalBackendUrl;
    }
  });

  it.each(["auth", "notes", "analytics"])(
    "forwards the allowed %s namespace to the matching Backend path",
    async (namespace) => {
      const response = createResponse();

      await proxyHandler(createRequest([namespace, "probe"]), response);

      const upstreamUrl = (global.fetch as jest.Mock).mock.calls[0][0] as URL;
      expect(upstreamUrl.toString()).toBe(`https://backend.internal.example/${namespace}/probe`);
    }
  );

  it("preserves method, JSON body, query, Authorization, Cookie, status, body, and content type", async () => {
    const upstream = createUpstreamResponse({
      status: 422,
      body: '{"error":"invalid"}',
      contentType: "application/problem+json",
    });
    global.fetch = jest.fn().mockResolvedValue(upstream);
    const request = createRequest(["notes", "2026-08-28"], {
      method: "POST",
      url: "/api/notes/2026-08-28?tag=legs%20and%20core",
      body: { exercises: [] },
      headers: {
        authorization: "Bearer access-token",
        cookie: "refreshToken=refresh-token",
        "content-type": "application/json",
      },
    });
    const response = createResponse();

    await proxyHandler(request, response);

    const [upstreamUrl, init] = (global.fetch as jest.Mock).mock.calls[0] as [URL, RequestInit];
    expect(upstreamUrl.toString()).toBe(
      "https://backend.internal.example/notes/2026-08-28?tag=legs%20and%20core"
    );
    expect(init.method).toBe("POST");
    expect(init.body).toBe('{"exercises":[]}');
    expect((init.headers as Headers).get("authorization")).toBe("Bearer access-token");
    expect((init.headers as Headers).get("cookie")).toBe("refreshToken=refresh-token");
    expect((init.headers as Headers).get("content-type")).toBe("application/json");
    expect(response.status).toHaveBeenCalledWith(422);
    expect(response.setHeader).toHaveBeenCalledWith("Content-Type", "application/problem+json");
    expect(response.send).toHaveBeenCalledWith(Buffer.from('{"error":"invalid"}'));
  });

  it("rejects an unknown namespace without contacting the Backend", async () => {
    const response = createResponse();

    await proxyHandler(createRequest(["admin", "users"]), response);

    expect(global.fetch).not.toHaveBeenCalled();
    expect(response.status).toHaveBeenCalledWith(404);
    expect(response.json).toHaveBeenCalledWith({ error: "Not Found" });
  });

  it("returns a sanitized 502 response for a Backend network failure", async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error("private backend detail"));
    const response = createResponse();

    await proxyHandler(createRequest(["auth", "session"]), response);

    expect(response.status).toHaveBeenCalledWith(502);
    expect(response.json).toHaveBeenCalledWith({ error: "Bad Gateway" });
  });

  it("aborts after 30 seconds and returns a sanitized 504 response", async () => {
    jest.useFakeTimers();
    global.fetch = jest.fn((_url: URL | RequestInfo, init?: RequestInit) => (
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(new Error("aborted")));
      })
    )) as jest.Mock;
    const response = createResponse();

    const pendingResponse = proxyHandler(createRequest(["auth", "refresh"]), response);
    await jest.advanceTimersByTimeAsync(30_000);
    await pendingResponse;

    expect(response.status).toHaveBeenCalledWith(504);
    expect(response.json).toHaveBeenCalledWith({ error: "Gateway Timeout" });
  });

  it.each([
    [["refreshToken=one; Path=/api/auth; HttpOnly; Secure; SameSite=Lax"]],
    [[
      "refreshToken=one; Path=/api/auth; HttpOnly; Secure; SameSite=Lax",
      "sessionHint=two; Path=/api/auth; HttpOnly; Secure; SameSite=Lax",
    ]],
    [["refreshToken=; Path=/api/auth; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; Secure; SameSite=Lax"]],
  ])("forwards Set-Cookie values independently without reparsing them", async (cookies) => {
    global.fetch = jest.fn().mockResolvedValue(createUpstreamResponse({ cookies }));
    const response = createResponse();

    await proxyHandler(createRequest(["auth", "logout"]), response);

    expect(response.setHeader).toHaveBeenCalledWith("Set-Cookie", cookies);
  });
});
