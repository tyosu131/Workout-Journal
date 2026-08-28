/** @jest-environment node */

const {
  getRefreshCookieOptions,
  setRefreshCookie,
  clearRefreshCookie,
} = require("../refreshCookie");

describe("refresh cookie contract", () => {
  const originalNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    if (originalNodeEnv === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = originalNodeEnv;
    }
  });

  it.each([
    ["production", true],
    ["development", false],
  ])("uses same-origin attributes in %s", (nodeEnv, secure) => {
    process.env.NODE_ENV = nodeEnv;

    expect(getRefreshCookieOptions()).toEqual({
      httpOnly: true,
      secure,
      sameSite: "lax",
      path: "/api/auth",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    expect(getRefreshCookieOptions()).not.toHaveProperty("domain");
  });

  it("uses the shared attributes when issuing and clearing the cookie", () => {
    process.env.NODE_ENV = "production";
    const res = { cookie: jest.fn(), clearCookie: jest.fn() };

    setRefreshCookie(res, "refresh-token");
    clearRefreshCookie(res);

    expect(res.cookie).toHaveBeenCalledWith("refreshToken", "refresh-token", {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/api/auth",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    expect(res.clearCookie).toHaveBeenCalledWith("refreshToken", {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/api/auth",
    });
  });
});
