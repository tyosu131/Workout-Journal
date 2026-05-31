/** @jest-environment node */

const supabase = {
  auth: {
    signInWithPassword: jest.fn(),
    signUp: jest.fn(),
    setSession: jest.fn(),
    updateUser: jest.fn(),
    resetPasswordForEmail: jest.fn(),
  },
  from: jest.fn(),
};

const authUtils = {
  verifyToken: jest.fn(),
  generateAccessToken: jest.fn(),
  generateRefreshToken: jest.fn(),
};

jest.mock("../../utils/supabaseClient", () => supabase);
jest.mock("../../utils/authUtils", () => authUtils);
jest.mock(
  "validator",
  () => ({
    isEmail: jest.fn((value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)),
    isLength: jest.fn((value, options) => value.length >= options.min),
  }),
  { virtual: true }
);

const {
  handleLogin,
  handleSignUp,
  handleResetPassword,
  handleForgotPassword,
} = require("../authService");

const createResponse = () => {
  const res = {
    status: jest.fn(),
    json: jest.fn(),
    cookie: jest.fn(),
  };
  res.status.mockReturnValue(res);
  return res;
};

const expectNoSupabaseAuthCalls = () => {
  expect(supabase.auth.signInWithPassword).not.toHaveBeenCalled();
  expect(supabase.auth.signUp).not.toHaveBeenCalled();
  expect(supabase.auth.setSession).not.toHaveBeenCalled();
  expect(supabase.auth.updateUser).not.toHaveBeenCalled();
  expect(supabase.auth.resetPasswordForEmail).not.toHaveBeenCalled();
};

describe("authService validation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("handleLogin", () => {
    const cases = [
      {
        name: "email missing",
        body: { password: "password123" },
        expected: { error: "Email is required" },
      },
      {
        name: "password missing",
        body: { email: "user@example.com" },
        expected: { error: "Password is required" },
      },
      {
        name: "invalid email",
        body: { email: "invalid-email", password: "password123" },
        expected: { error: "Invalid email format" },
      },
      {
        name: "short password",
        body: { email: "user@example.com", password: "short" },
        expected: { error: "Password must be at least 6 characters long" },
      },
    ];

    it.each(cases)("returns 400 when $name", async ({ body, expected }) => {
      const req = { body };
      const res = createResponse();

      await handleLogin(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expected);
      expect(supabase.auth.signInWithPassword).not.toHaveBeenCalled();
      expect(authUtils.generateAccessToken).not.toHaveBeenCalled();
      expect(authUtils.generateRefreshToken).not.toHaveBeenCalled();
    });
  });

  describe("handleSignUp", () => {
    const cases = [
      {
        name: "username missing",
        body: { email: "user@example.com", password: "password123" },
        expected: { error: "Username is required" },
      },
      {
        name: "email missing",
        body: { username: "user", password: "password123" },
        expected: { error: "Email is required" },
      },
      {
        name: "password missing",
        body: { username: "user", email: "user@example.com" },
        expected: { error: "Password is required" },
      },
      {
        name: "invalid email",
        body: { username: "user", email: "invalid-email", password: "password123" },
        expected: { error: "Invalid email format" },
      },
      {
        name: "short password",
        body: { username: "user", email: "user@example.com", password: "short" },
        expected: { error: "Password must be at least 6 characters long" },
      },
    ];

    it.each(cases)("returns 400 when $name", async ({ body, expected }) => {
      const req = { body };
      const res = createResponse();

      await handleSignUp(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expected);
      expect(supabase.auth.signUp).not.toHaveBeenCalled();
      expect(supabase.from).not.toHaveBeenCalled();
      expect(authUtils.generateAccessToken).not.toHaveBeenCalled();
      expect(authUtils.generateRefreshToken).not.toHaveBeenCalled();
    });
  });

  describe("handleResetPassword", () => {
    const cases = [
      {
        name: "accessToken missing",
        body: { newPassword: "password123" },
        expected: { error: "Access token is missing" },
      },
      {
        name: "newPassword missing",
        body: { accessToken: "dummy-access-token" },
        expected: { error: "New password is required" },
      },
      {
        name: "short newPassword",
        body: { accessToken: "dummy-access-token", newPassword: "short" },
        expected: { error: "Password must be at least 6 characters long" },
      },
    ];

    it.each(cases)("returns 400 when $name", async ({ body, expected }) => {
      const req = { body };
      const res = createResponse();

      await handleResetPassword(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expected);
      expect(supabase.auth.setSession).not.toHaveBeenCalled();
      expect(supabase.auth.updateUser).not.toHaveBeenCalled();
    });
  });

  describe("handleForgotPassword", () => {
    it("returns 400 when email is missing", async () => {
      const req = { body: {} };
      const res = createResponse();

      await handleForgotPassword(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: "Email is required" });
      expect(supabase.auth.resetPasswordForEmail).not.toHaveBeenCalled();
    });
  });

  it("does not call Supabase auth for validation failures", () => {
    expectNoSupabaseAuthCalls();
  });
});
