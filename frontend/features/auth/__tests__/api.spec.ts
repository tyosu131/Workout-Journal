/// <reference types="jest" />

const apiRequest = jest.fn();

jest.mock("../../../lib/apiClient", () => ({
  apiRequest,
}));

const { loginUser } = require("../api") as typeof import("../api");

describe("loginUser", () => {
  it("uses the common API client with the Express login path", async () => {
    apiRequest.mockResolvedValue({ token: "test-token" });

    await expect(loginUser("user@example.test", "password")).resolves.toEqual({
      token: "test-token",
    });

    expect(apiRequest).toHaveBeenCalledWith("/auth/login", "post", {
      email: "user@example.test",
      password: "password",
    });
  });
});
