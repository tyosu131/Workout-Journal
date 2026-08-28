import type { NextApiRequest, NextApiResponse } from "next";

const ALLOWED_NAMESPACES = new Set(["auth", "notes", "analytics"]);
const UPSTREAM_TIMEOUT_MS = 30_000;
const FORWARDED_REQUEST_HEADERS = ["accept", "authorization", "content-type", "cookie"];

type UpstreamHeaders = Headers & {
  getSetCookie?: () => string[];
};

const getProxyPath = (request: NextApiRequest): string[] => {
  const proxyPath = request.query.proxyPath;
  if (Array.isArray(proxyPath)) {
    return proxyPath;
  }
  return typeof proxyPath === "string" ? [proxyPath] : [];
};

const getSearch = (requestUrl: string | undefined): string => {
  if (!requestUrl) {
    return "";
  }
  return new URL(requestUrl, "http://same-origin.invalid").search;
};

const getUpstreamUrl = (request: NextApiRequest, proxyPath: string[]): URL => {
  const backendInternalUrl = process.env.BACKEND_INTERNAL_URL;
  if (!backendInternalUrl) {
    throw new Error("Backend URL is not configured");
  }

  const upstreamUrl = new URL(backendInternalUrl);
  if (upstreamUrl.protocol !== "http:" && upstreamUrl.protocol !== "https:") {
    throw new Error("Backend URL protocol is invalid");
  }

  upstreamUrl.pathname = `/${proxyPath.map(encodeURIComponent).join("/")}`;
  upstreamUrl.search = getSearch(request.url);
  upstreamUrl.hash = "";
  return upstreamUrl;
};

const getRequestHeaders = (request: NextApiRequest): Headers => {
  const headers = new Headers();
  for (const name of FORWARDED_REQUEST_HEADERS) {
    const value = request.headers[name];
    if (Array.isArray(value)) {
      headers.set(name, name === "cookie" ? value.join("; ") : value.join(", "));
    } else if (value !== undefined) {
      headers.set(name, value);
    }
  }
  return headers;
};

const getRequestBody = (request: NextApiRequest): string | undefined => {
  if (request.method === "GET" || request.method === "HEAD" || request.body === undefined) {
    return undefined;
  }
  return typeof request.body === "string" ? request.body : JSON.stringify(request.body);
};

const forwardSetCookies = (headers: UpstreamHeaders, response: NextApiResponse) => {
  const cookieValues = headers.getSetCookie?.() ?? [];
  if (cookieValues.length > 0) {
    response.setHeader("Set-Cookie", cookieValues);
    return;
  }

  const singleCookie = headers.get("set-cookie");
  if (singleCookie) {
    response.setHeader("Set-Cookie", [singleCookie]);
  }
};

export default async function proxyHandler(request: NextApiRequest, response: NextApiResponse) {
  const proxyPath = getProxyPath(request);
  if (proxyPath.length === 0 || !ALLOWED_NAMESPACES.has(proxyPath[0])) {
    return response.status(404).json({ error: "Not Found" });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);

  try {
    const upstreamResponse = await fetch(getUpstreamUrl(request, proxyPath), {
      method: request.method,
      headers: getRequestHeaders(request),
      body: getRequestBody(request),
      redirect: "manual",
      signal: controller.signal,
    });

    const contentType = upstreamResponse.headers.get("content-type");
    if (contentType) {
      response.setHeader("Content-Type", contentType);
    }
    forwardSetCookies(upstreamResponse.headers as UpstreamHeaders, response);

    const responseBody = Buffer.from(await upstreamResponse.arrayBuffer());
    return response.status(upstreamResponse.status).send(responseBody);
  } catch {
    if (controller.signal.aborted) {
      return response.status(504).json({ error: "Gateway Timeout" });
    }
    return response.status(502).json({ error: "Bad Gateway" });
  } finally {
    clearTimeout(timeout);
  }
}
