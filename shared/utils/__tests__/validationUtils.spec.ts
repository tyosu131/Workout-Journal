/// <reference types="jest" />

import { validateEmail } from "../validationUtils";

describe("validateEmail", () => {
  it("accepts a basic valid email address", () => {
    expect(validateEmail("user@example.com")).toBe(true);
  });

  it("rejects invalid email addresses", () => {
    expect(validateEmail("user.example.com")).toBe(false);
    expect(validateEmail("user@")).toBe(false);
    expect(validateEmail("user@ example.com")).toBe(false);
  });
});
