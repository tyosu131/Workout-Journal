import { getErrorSummary } from "../errorSummary";

describe("getErrorSummary", () => {
  it("keeps only allow-listed diagnostic fields", () => {
    const summary = getErrorSummary({
      name: "AxiosError",
      code: "ERR_BAD_RESPONSE",
      message: "email=user@example.com token=secret-token",
      response: {
        status: 500,
        data: { profile: { id: "user-uuid" } },
      },
    });

    expect(summary).toEqual({
      name: "AxiosError",
      code: "ERR_BAD_RESPONSE",
      status: 500,
    });
    expect(JSON.stringify(summary)).not.toContain("user@example.com");
    expect(JSON.stringify(summary)).not.toContain("secret-token");
    expect(JSON.stringify(summary)).not.toContain("user-uuid");
  });
});
