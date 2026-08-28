/// <reference types="jest" />

const apiRequest = jest.fn();

jest.mock("../../../lib/apiClient", () => ({
  apiRequest,
  apiRequestWithAuth: jest.fn(),
}));

const { loginUser, logoutUser } = require("../api") as typeof import("../api");

describe("loginUser", () => {
  it("uses the common API client with the same-origin login path", async () => {
    apiRequest.mockResolvedValue({ token: "test-token" });

    await expect(loginUser("user@example.test", "password")).resolves.toEqual({
      token: "test-token",
    });

    expect(apiRequest).toHaveBeenCalledWith("/api/auth/login", "post", {
      email: "user@example.test",
      password: "password",
    });
  });

  it("calls the same-origin Backend logout boundary", async () => {
    apiRequest.mockResolvedValue(undefined);

    await logoutUser();

    expect(apiRequest).toHaveBeenCalledWith("/api/auth/logout", "post", {});
  });
});
