/** @jest-environment node */

const { getErrorSummary } = require("../errorSummary");

describe("getErrorSummary", () => {
  it("does not retain messages, tokens, or profile fields", () => {
    const summary = getErrorSummary({
      name: "PostgrestError",
      code: "PGRST000",
      status: 500,
      message: "user@example.com secret-token",
      profile: { id: "user-uuid" },
    });

    expect(summary).toEqual({
      name: "PostgrestError",
      code: "PGRST000",
      status: 500,
    });
    expect(JSON.stringify(summary)).not.toContain("user@example.com");
    expect(JSON.stringify(summary)).not.toContain("secret-token");
    expect(JSON.stringify(summary)).not.toContain("user-uuid");
  });
});
