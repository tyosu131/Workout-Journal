/// <reference types="jest" />

export {};

const createClient = jest.fn();

jest.mock("@supabase/supabase-js", () => ({ createClient }));

describe("createRecoveryAuthClient", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_SUPABASE_URL: "https://example.invalid",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "publishable-test-key",
    };
    createClient.mockReset();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("uses only the publishable key and keeps recovery sessions non-persistent", () => {
    createClient.mockReturnValue({ auth: {} });
    const { createRecoveryAuthClient } = require("../supabaseAuthClient") as typeof import("../supabaseAuthClient");

    createRecoveryAuthClient();

    expect(createClient).toHaveBeenCalledWith(
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
