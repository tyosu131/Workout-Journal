/** @jest-environment node */

const adminDbClient = {
  from: jest.fn(),
  auth: {
    signUp: jest.fn(),
    signInWithPassword: jest.fn(),
    setSession: jest.fn(),
    updateUser: jest.fn(),
  },
};
const getAdminDbClient = jest.fn(() => adminDbClient);
const createAuthClient = jest.fn();
const authUtils = {
  verifyToken: jest.fn(),
  generateAccessToken: jest.fn(),
  generateRefreshToken: jest.fn(),
};

jest.mock("../../utils/supabaseAdminClient", () => ({ getAdminDbClient }));
jest.mock("../../utils/supabaseAuthClient", () => ({ createAuthClient }));
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
  handleSession,
  handleRefresh,
  handleSignUp,
  handleLogin,
  handleGetUser,
  handleUpdateUser,
  handleForgotPassword,
} = require("../authService");

const createResponse = () => {
  const res = { status: jest.fn(), json: jest.fn(), cookie: jest.fn() };
  res.status.mockReturnValue(res);
  return res;
};

const authClient = (overrides = {}) => ({
  auth: {
    signUp: jest.fn(),
    signInWithPassword: jest.fn(),
    resetPasswordForEmail: jest.fn(),
    ...overrides,
  },
});

const mockProfileLookup = (
  profile = { uuid: "user-123", name: "User", email: "user@example.com" },
  { method = "single", error = null } = {}
) => {
  const result = jest.fn().mockResolvedValue({ data: profile, error });
  const eq = jest.fn(() => ({ [method]: result }));
  const select = jest.fn(() => ({ eq }));
  adminDbClient.from.mockReturnValue({ select });
  return { select, eq, result };
};

describe("authService client boundaries", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv, PASSWORD_RESET_REDIRECT_URL: "http://localhost:3000/reset-password" };
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it.each([
    [{ password: "password123" }, { error: "Email is required" }],
    [{ email: "user@example.com" }, { error: "Password is required" }],
    [{ email: "invalid-email", password: "password123" }, { error: "Invalid email format" }],
    [{ email: "user@example.com", password: "short" }, { error: "Password must be at least 6 characters long" }],
  ])("rejects invalid login input before creating an Auth client", async (body, expected) => {
    const res = createResponse();

    await handleLogin({ body }, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expected);
    expect(createAuthClient).not.toHaveBeenCalled();
    expect(getAdminDbClient).not.toHaveBeenCalled();
  });

  it.each([
    [{ email: "user@example.com", password: "password123" }, { error: "Username is required" }],
    [{ username: "User", password: "password123" }, { error: "Email is required" }],
    [{ username: "User", email: "user@example.com" }, { error: "Password is required" }],
    [{ username: "User", email: "invalid-email", password: "password123" }, { error: "Invalid email format" }],
    [{ username: "User", email: "user@example.com", password: "short" }, { error: "Password must be at least 6 characters long" }],
  ])("rejects invalid signup input before Auth or DB operations", async (body, expected) => {
    const res = createResponse();

    await handleSignUp({ body }, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expected);
    expect(createAuthClient).not.toHaveBeenCalled();
    expect(getAdminDbClient).not.toHaveBeenCalled();
  });

  it("returns verification-required without DB work or backend tokens when signup has no session", async () => {
    const currentAuthClient = authClient({
      signUp: jest.fn().mockResolvedValue({
        data: { user: { id: "user-123", email: "user@example.com" }, session: null },
        error: null,
      }),
    });
    createAuthClient.mockReturnValue(currentAuthClient);
    const res = createResponse();

    await handleSignUp({ body: { username: "User", email: "user@example.com", password: "password123" } }, res);

    expect(currentAuthClient.auth.signUp).toHaveBeenCalledWith({
      email: "user@example.com",
      password: "password123",
      options: { data: { username: "User" } },
    });
    expect(getAdminDbClient).not.toHaveBeenCalled();
    expect(authUtils.generateAccessToken).not.toHaveBeenCalled();
    expect(authUtils.generateRefreshToken).not.toHaveBeenCalled();
    expect(res.cookie).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      user: { id: "user-123", email: "user@example.com" },
      verificationRequired: true,
    });
  });

  it("uses a request-local Auth client before the Admin/DB client during session-backed signup", async () => {
    const currentAuthClient = authClient({
      signUp: jest.fn().mockResolvedValue({
        data: {
          user: { id: "user-123", email: "user@example.com" },
          session: { access_token: "supabase-session-token" },
        },
        error: null,
      }),
    });
    const upsert = jest.fn().mockResolvedValue({ error: null });
    createAuthClient.mockReturnValue(currentAuthClient);
    adminDbClient.from.mockReturnValue({ upsert });
    authUtils.generateAccessToken.mockReturnValue("backend-access-token");
    authUtils.generateRefreshToken.mockReturnValue("backend-refresh-token");
    const res = createResponse();

    await handleSignUp({ body: { username: "User", email: "user@example.com", password: "password123" } }, res);

    expect(upsert).toHaveBeenCalledWith(
      [{ uuid: "user-123", name: "User", email: "user@example.com" }],
      { onConflict: "uuid" }
    );
    expect(adminDbClient.auth.signUp).not.toHaveBeenCalled();
    expect(authUtils.generateAccessToken).toHaveBeenCalledWith({ id: "user-123", email: "user@example.com" });
    expect(authUtils.generateRefreshToken).toHaveBeenCalledWith({ id: "user-123", email: "user@example.com" });
    expect(res.cookie).toHaveBeenCalledWith(
      "refreshToken",
      "backend-refresh-token",
      expect.objectContaining({ httpOnly: true })
    );
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      token: "backend-access-token",
      user: { id: "user-123", email: "user@example.com" },
      verificationRequired: false,
    });
  });

  it("does not access the Admin/DB client when signup fails in Auth", async () => {
    const currentAuthClient = authClient({ signUp: jest.fn().mockResolvedValue({ data: {}, error: new Error("signup failed") }) });
    createAuthClient.mockReturnValue(currentAuthClient);
    jest.spyOn(console, "error").mockImplementation(() => {});
    const res = createResponse();

    await handleSignUp({ body: { username: "User", email: "user@example.com", password: "password123" } }, res);

    expect(adminDbClient.from).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it("returns an error when profile creation fails after signup", async () => {
    const currentAuthClient = authClient({
      signUp: jest.fn().mockResolvedValue({
        data: {
          user: { id: "user-123", email: "user@example.com" },
          session: { access_token: "supabase-session-token" },
        },
        error: null,
      }),
    });
    createAuthClient.mockReturnValue(currentAuthClient);
    adminDbClient.from.mockReturnValue({ upsert: jest.fn().mockResolvedValue({ error: new Error("profile failed") }) });
    jest.spyOn(console, "error").mockImplementation(() => {});
    const res = createResponse();

    await handleSignUp({ body: { username: "User", email: "user@example.com", password: "password123" } }, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: "profile failed" });
  });

  it("uses a new Auth client for each login without returning a Supabase session", async () => {
    const firstClient = authClient({
      signInWithPassword: jest.fn().mockResolvedValue({ data: { user: { id: "one", email: "one@example.com" } }, error: null }),
    });
    const secondClient = authClient({
      signInWithPassword: jest.fn().mockResolvedValue({ data: { user: { id: "two", email: "two@example.com" } }, error: null }),
    });
    createAuthClient.mockReturnValueOnce(firstClient).mockReturnValueOnce(secondClient);
    mockProfileLookup({ uuid: "one" }, { method: "maybeSingle" });
    authUtils.generateAccessToken.mockReturnValue("backend-access-token");
    authUtils.generateRefreshToken.mockReturnValue("backend-refresh-token");

    const firstResponse = createResponse();
    const secondResponse = createResponse();
    await handleLogin({ body: { email: "one@example.com", password: "password123" } }, firstResponse);
    await handleLogin({ body: { email: "two@example.com", password: "password123" } }, secondResponse);

    expect(createAuthClient).toHaveBeenCalledTimes(2);
    expect(firstClient.auth.signInWithPassword).toHaveBeenCalledTimes(1);
    expect(secondClient.auth.signInWithPassword).toHaveBeenCalledTimes(1);
    expect(firstResponse.json.mock.calls[0][0]).not.toHaveProperty("session");
    expect(adminDbClient.auth.signInWithPassword).not.toHaveBeenCalled();
  });

  it("does not overwrite an existing login profile", async () => {
    const currentAuthClient = authClient({
      signInWithPassword: jest.fn().mockResolvedValue({
        data: { user: { id: "user-123", email: "user@example.com", user_metadata: { username: "New name" } } },
        error: null,
      }),
    });
    createAuthClient.mockReturnValue(currentAuthClient);
    const lookup = mockProfileLookup({ uuid: "user-123" }, { method: "maybeSingle" });
    authUtils.generateAccessToken.mockReturnValue("backend-access-token");
    authUtils.generateRefreshToken.mockReturnValue("backend-refresh-token");
    const res = createResponse();

    await handleLogin({ body: { email: "user@example.com", password: "password123" } }, res);

    expect(lookup.result).toHaveBeenCalled();
    expect(adminDbClient.from.mock.results.map(({ value }) => value.upsert).filter(Boolean)).toHaveLength(0);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("creates a missing login profile from Supabase user data", async () => {
    const currentAuthClient = authClient({
      signInWithPassword: jest.fn().mockResolvedValue({
        data: { user: { id: "user-123", email: "user@example.com", user_metadata: { username: "User" } } },
        error: null,
      }),
    });
    const maybeSingle = jest.fn().mockResolvedValue({ data: null, error: null });
    const select = jest.fn(() => ({ eq: jest.fn(() => ({ maybeSingle })) }));
    const upsert = jest.fn().mockResolvedValue({ error: null });
    adminDbClient.from.mockReturnValueOnce({ select }).mockReturnValueOnce({ upsert });
    createAuthClient.mockReturnValue(currentAuthClient);
    authUtils.generateAccessToken.mockReturnValue("backend-access-token");
    authUtils.generateRefreshToken.mockReturnValue("backend-refresh-token");
    const res = createResponse();

    await handleLogin({ body: { email: "user@example.com", password: "password123" } }, res);

    expect(upsert).toHaveBeenCalledWith(
      [{ uuid: "user-123", name: "User", email: "user@example.com" }],
      { onConflict: "uuid" }
    );
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("fails login without issuing backend tokens when profile lookup returns a DB error", async () => {
    const currentAuthClient = authClient({
      signInWithPassword: jest.fn().mockResolvedValue({
        data: { user: { id: "user-123", email: "user@example.com" } },
        error: null,
      }),
    });
    createAuthClient.mockReturnValue(currentAuthClient);
    mockProfileLookup(null, { method: "maybeSingle", error: new Error("profile lookup failed") });
    jest.spyOn(console, "error").mockImplementation(() => {});
    const res = createResponse();

    await handleLogin({ body: { email: "user@example.com", password: "password123" } }, res);

    expect(authUtils.generateAccessToken).not.toHaveBeenCalled();
    expect(authUtils.generateRefreshToken).not.toHaveBeenCalled();
    expect(res.cookie).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it("uses the Admin/DB client for session and profile reads", async () => {
    authUtils.verifyToken.mockResolvedValue({ id: "user-123" });
    const { select } = mockProfileLookup();
    const sessionResponse = createResponse();

    await handleSession({ headers: { authorization: "Bearer backend-token" } }, sessionResponse);

    expect(getAdminDbClient).toHaveBeenCalled();
    expect(select).toHaveBeenCalledWith("uuid, name, email");
    expect(sessionResponse.status).toHaveBeenCalledWith(200);

    jest.clearAllMocks();
    authUtils.verifyToken.mockResolvedValue({ id: "user-123" });
    mockProfileLookup();
    const userResponse = createResponse();
    await handleGetUser({ headers: { authorization: "Bearer backend-token" } }, userResponse);
    expect(getAdminDbClient).toHaveBeenCalled();
    expect(adminDbClient.auth.updateUser).not.toHaveBeenCalled();
  });

  it("updates only the username when the submitted email is unchanged", async () => {
    authUtils.verifyToken.mockResolvedValue({ id: "user-123" });
    const lookup = { maybeSingle: jest.fn().mockResolvedValue({ data: { uuid: "user-123", email: "user@example.com" }, error: null }) };
    const select = jest.fn(() => ({ eq: jest.fn(() => lookup) }));
    const update = jest.fn(() => ({ eq: jest.fn().mockResolvedValue({ error: null }) }));
    adminDbClient.from.mockReturnValueOnce({ select }).mockReturnValueOnce({ update });
    const res = createResponse();

    await handleUpdateUser(
      { headers: { authorization: "Bearer backend-token" }, body: { username: "Renamed", email: "user@example.com", password: "******" } },
      res
    );

    expect(update).toHaveBeenCalledWith({ name: "Renamed" });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(adminDbClient.auth.updateUser).not.toHaveBeenCalled();
  });

  it("rejects email and password changes without updating the profile", async () => {
    authUtils.verifyToken.mockResolvedValue({ id: "user-123" });
    mockProfileLookup({ uuid: "user-123", email: "user@example.com" }, { method: "maybeSingle" });
    const emailResponse = createResponse();
    await handleUpdateUser(
      { headers: { authorization: "Bearer backend-token" }, body: { username: "User", email: "changed@example.com", password: "******" } },
      emailResponse
    );
    expect(emailResponse.status).toHaveBeenCalledWith(400);

    jest.clearAllMocks();
    authUtils.verifyToken.mockResolvedValue({ id: "user-123" });
    mockProfileLookup({ uuid: "user-123", email: "user@example.com" }, { method: "maybeSingle" });
    const passwordResponse = createResponse();
    await handleUpdateUser(
      { headers: { authorization: "Bearer backend-token" }, body: { username: "User", email: "user@example.com", password: "new-password" } },
      passwordResponse
    );
    expect(passwordResponse.status).toHaveBeenCalledWith(400);
    expect(adminDbClient.auth.updateUser).not.toHaveBeenCalled();
  });

  it("returns 404 when the current profile does not exist", async () => {
    authUtils.verifyToken.mockResolvedValue({ id: "user-123" });
    mockProfileLookup(null, { method: "maybeSingle" });
    const res = createResponse();

    await handleUpdateUser(
      { headers: { authorization: "Bearer backend-token" }, body: { username: "User", email: "user@example.com", password: "******" } },
      res
    );

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: "User not found" });
  });

  it("returns 500 when the current-profile query fails", async () => {
    authUtils.verifyToken.mockResolvedValue({ id: "user-123" });
    mockProfileLookup(null, { method: "maybeSingle", error: new Error("profile lookup failed") });
    jest.spyOn(console, "error").mockImplementation(() => {});
    const res = createResponse();

    await handleUpdateUser(
      { headers: { authorization: "Bearer backend-token" }, body: { username: "User", email: "user@example.com", password: "******" } },
      res
    );

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: "Database error" });
  });

  it("uses an Auth client and the configured redirect URL for forgot-password", async () => {
    const currentAuthClient = authClient({ resetPasswordForEmail: jest.fn().mockResolvedValue({ error: null }) });
    createAuthClient.mockReturnValue(currentAuthClient);
    const res = createResponse();

    await handleForgotPassword({ body: { email: "user@example.com" } }, res);

    expect(currentAuthClient.auth.resetPasswordForEmail).toHaveBeenCalledWith("user@example.com", {
      redirectTo: "http://localhost:3000/reset-password",
    });
    expect(adminDbClient.auth.signInWithPassword).not.toHaveBeenCalled();
  });

  it("rejects a forgot-password request without an email before creating an Auth client", async () => {
    const res = createResponse();

    await handleForgotPassword({ body: {} }, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "Email is required" });
    expect(createAuthClient).not.toHaveBeenCalled();
  });

  it("fails clearly when the password-reset redirect URL is missing", async () => {
    delete process.env.PASSWORD_RESET_REDIRECT_URL;
    jest.spyOn(console, "error").mockImplementation(() => {});
    const res = createResponse();

    await handleForgotPassword({ body: { email: "user@example.com" } }, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(createAuthClient).not.toHaveBeenCalled();
  });

  it("continues to refresh only the backend JWT", async () => {
    authUtils.verifyToken.mockResolvedValue({ id: "user-123", email: "user@example.com" });
    authUtils.generateAccessToken.mockReturnValue("backend-access-token");
    const res = createResponse();

    await handleRefresh({ cookies: { refreshToken: "backend-refresh-token" } }, res);

    expect(res.json).toHaveBeenCalledWith({ access_token: "backend-access-token" });
    expect(createAuthClient).not.toHaveBeenCalled();
    expect(getAdminDbClient).not.toHaveBeenCalled();
  });

  it("rejects missing or invalid backend refresh tokens without Supabase operations", async () => {
    const missingTokenResponse = createResponse();
    await handleRefresh({ cookies: {} }, missingTokenResponse);
    expect(missingTokenResponse.status).toHaveBeenCalledWith(401);
    expect(missingTokenResponse.json).toHaveBeenCalledWith({ error: "Refresh token is missing" });

    jest.clearAllMocks();
    authUtils.verifyToken.mockResolvedValue(null);
    const invalidTokenResponse = createResponse();
    await handleRefresh({ cookies: { refreshToken: "invalid-backend-refresh-token" } }, invalidTokenResponse);
    expect(invalidTokenResponse.status).toHaveBeenCalledWith(401);
    expect(invalidTokenResponse.json).toHaveBeenCalledWith({ error: "Invalid or expired refresh token" });
    expect(createAuthClient).not.toHaveBeenCalled();
    expect(getAdminDbClient).not.toHaveBeenCalled();
  });
});
