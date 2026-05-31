/// <reference types="jest" />

type MockAxiosClient = jest.Mock & {
  request: jest.Mock;
  post: jest.Mock;
  interceptors: {
    response: {
      use: jest.Mock;
    };
  };
};

type LoadedApiClient = typeof import("../apiClient") & {
  __mocks: {
    client: MockAxiosClient;
    request: jest.Mock;
    post: jest.Mock;
    getToken: jest.Mock;
    setToken: jest.Mock;
    removeToken: jest.Mock;
    getRejectedInterceptor: () => (error: unknown) => Promise<unknown>;
  };
};

const loadApiClient = (): LoadedApiClient => {
  jest.resetModules();

  let rejectedInterceptor: ((error: unknown) => Promise<unknown>) | undefined;
  const request = jest.fn();
  const post = jest.fn();
  const client = jest.fn() as MockAxiosClient;
  client.request = request;
  client.post = post;
  client.interceptors = {
    response: {
      use: jest.fn((_onFulfilled, onRejected) => {
        rejectedInterceptor = onRejected;
      }),
    },
  };

  const getToken = jest.fn();
  const setToken = jest.fn();
  const removeToken = jest.fn();

  jest.doMock("axios", () => ({
    __esModule: true,
    default: {
      create: jest.fn(() => client),
    },
  }));

  jest.doMock("../../../shared/utils/tokenUtils", () => ({
    getToken,
    setToken,
    removeToken,
  }));

  const apiClientModule = require("../apiClient") as typeof import("../apiClient");

  return {
    ...apiClientModule,
    __mocks: {
      client,
      request,
      post,
      getToken,
      setToken,
      removeToken,
      getRejectedInterceptor: () => {
        if (!rejectedInterceptor) {
          throw new Error("Response interceptor was not registered");
        }
        return rejectedInterceptor;
      },
    },
  };
};

describe("apiClient", () => {
  afterEach(() => {
    jest.restoreAllMocks();
    jest.dontMock("axios");
    jest.dontMock("../../../shared/utils/tokenUtils");
  });

  describe("apiRequestWithAuth", () => {
    it("sends an Authorization header when a token exists and returns response data", async () => {
      const { apiRequestWithAuth, __mocks } = loadApiClient();
      __mocks.getToken.mockReturnValue("dummy-token");
      __mocks.request.mockResolvedValue({ data: { ok: true } });

      await expect(apiRequestWithAuth("/private", "get")).resolves.toEqual({ ok: true });

      expect(__mocks.request).toHaveBeenCalledWith({
        url: "/private",
        method: "get",
        data: undefined,
        headers: {
          Authorization: "Bearer dummy-token",
        },
      });
    });

    it("throws when no access token exists", async () => {
      const { apiRequestWithAuth, __mocks } = loadApiClient();
      __mocks.getToken.mockReturnValue(null);

      await expect(apiRequestWithAuth("/private", "get")).rejects.toThrow(
        "アクセストークンが見つかりません"
      );
      expect(__mocks.request).not.toHaveBeenCalled();
    });
  });

  describe("apiRequest", () => {
    it("sends a request without adding an Authorization header and returns response data", async () => {
      const { apiRequest, __mocks } = loadApiClient();
      __mocks.request.mockResolvedValue({ data: { created: true } });

      await expect(apiRequest("/login", "post", { email: "user@example.com" })).resolves.toEqual({
        created: true,
      });

      expect(__mocks.request).toHaveBeenCalledWith({
        url: "/login",
        method: "post",
        data: { email: "user@example.com" },
      });
      expect(__mocks.request.mock.calls[0][0].headers).toBeUndefined();
    });
  });

  describe("response interceptor", () => {
    it("refreshes a 401 request, stores the new token, and retries the original request", async () => {
      const { __mocks } = loadApiClient();
      jest.spyOn(console, "log").mockImplementation(() => {});
      const originalRequest = { headers: {} as Record<string, unknown> };
      const error = {
        isAxiosError: true,
        response: { status: 401 },
        config: originalRequest,
      };

      __mocks.post.mockResolvedValue({ data: { access_token: "new-dummy-token" } });
      __mocks.client.mockResolvedValue({ data: { retried: true } });

      await expect(__mocks.getRejectedInterceptor()(error)).resolves.toEqual({
        data: { retried: true },
      });

      expect(__mocks.post).toHaveBeenCalledWith("/api/auth/refresh", {});
      expect(__mocks.setToken).toHaveBeenCalledWith("new-dummy-token");
      expect(originalRequest.headers.Authorization).toBe("Bearer new-dummy-token");
      expect(originalRequest.headers._retry).toBe(true);
      expect(__mocks.client).toHaveBeenCalledWith(originalRequest);
    });

    it("removes the token and rejects when refresh fails", async () => {
      const { __mocks } = loadApiClient();
      jest.spyOn(console, "error").mockImplementation(() => {});
      const originalRequest = { headers: {} as Record<string, unknown> };
      const error = {
        isAxiosError: true,
        response: { status: 401 },
        config: originalRequest,
      };
      const refreshError = {
        isAxiosError: true,
        response: { data: { error: "refresh failed" } },
        message: "refresh failed",
      };

      __mocks.post.mockRejectedValue(refreshError);

      await expect(__mocks.getRejectedInterceptor()(error)).rejects.toBe(refreshError);

      expect(__mocks.removeToken).toHaveBeenCalledTimes(1);
      expect(__mocks.setToken).not.toHaveBeenCalled();
      expect(__mocks.client).not.toHaveBeenCalled();
    });

    it("removes the token and does not refresh on a network error", async () => {
      const { __mocks } = loadApiClient();
      jest.spyOn(console, "error").mockImplementation(() => {});
      const error = {
        isAxiosError: true,
        code: "ERR_NETWORK",
      };

      await expect(__mocks.getRejectedInterceptor()(error)).rejects.toBe(error);

      expect(__mocks.removeToken).toHaveBeenCalledTimes(1);
      expect(__mocks.post).not.toHaveBeenCalled();
    });
  });
});
