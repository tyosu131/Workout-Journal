/** @jest-environment node */

const createClient = jest.fn();

jest.mock(
  "@supabase/supabase-js",
  () => ({ createClient }),
  { virtual: true }
);

const originalEnv = process.env;

const loadAdminClient = () => {
  jest.resetModules();
  return require("../supabaseAdminClient");
};

const loadAuthClient = () => {
  jest.resetModules();
  return require("../supabaseAuthClient");
};

describe("Supabase client boundaries", () => {
  beforeEach(() => {
    process.env = {
      ...originalEnv,
      SUPABASE_URL: "https://example.invalid",
      SUPABASE_PUBLISHABLE_KEY: "publishable-test-key",
      SUPABASE_SECRET_KEY: "secret-test-key",
    };
    createClient.mockReset();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("creates one Admin/DB client with the secret key and non-persistent auth settings", () => {
    const adminClient = { from: jest.fn() };
    createClient.mockReturnValue(adminClient);

    const { getAdminDbClient } = loadAdminClient();

    expect(getAdminDbClient()).toBe(adminClient);
    expect(getAdminDbClient()).toBe(adminClient);
    expect(createClient).toHaveBeenCalledTimes(1);
    expect(createClient).toHaveBeenCalledWith(
      "https://example.invalid",
      "secret-test-key",
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      }
    );
  });

  it("creates a distinct Auth client for each operation with the publishable key", () => {
    const firstClient = { auth: {} };
    const secondClient = { auth: {} };
    createClient.mockReturnValueOnce(firstClient).mockReturnValueOnce(secondClient);

    const { createAuthClient } = loadAuthClient();

    expect(createAuthClient()).toBe(firstClient);
    expect(createAuthClient()).toBe(secondClient);
    expect(createClient).toHaveBeenNthCalledWith(
      1,
      "https://example.invalid",
      "publishable-test-key",
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      }
    );
  });
});
