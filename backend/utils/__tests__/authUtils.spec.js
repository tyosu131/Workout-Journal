/** @jest-environment node */

jest.mock(
  "jsonwebtoken",
  () => ({
    sign: jest.fn((payload, secret, options) =>
      Buffer.from(JSON.stringify({ payload, secret, options })).toString("base64url")
    ),
    verify: jest.fn((token, secret) => {
      try {
        const decoded = JSON.parse(Buffer.from(token, "base64url").toString("utf8"));
        if (decoded.secret !== secret) {
          throw new Error("invalid signature");
        }
        return decoded.payload;
      } catch (error) {
        throw new Error("jwt malformed");
      }
    }),
  }),
  { virtual: true }
);

const jwt = require("jsonwebtoken");
const {
  validateEmail,
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
  refreshAccessToken,
} = require("../authUtils");

const ORIGINAL_ENV = process.env;
const TEST_SECRET = "test-secret";
const TEST_USER = {
  id: "user-123",
  email: "user@example.com",
};

describe("authUtils", () => {
  beforeEach(() => {
    process.env = {
      ...ORIGINAL_ENV,
      JWT_SECRET: TEST_SECRET,
      ACCESS_TOKEN_EXPIRES: "1h",
      REFRESH_TOKEN_EXPIRES: "7d",
    };
  });

  afterEach(() => {
    jest.restoreAllMocks();
    process.env = ORIGINAL_ENV;
  });

  describe("validateEmail", () => {
    it("returns true for a valid email", () => {
      expect(validateEmail("user@example.com")).toBe(true);
    });

    it("returns false for an invalid email", () => {
      expect(validateEmail("user.example.com")).toBe(false);
    });
  });

  describe("generateAccessToken", () => {
    it("generates a verifiable access token with expected payload fields", () => {
      const token = generateAccessToken(TEST_USER);
      const decoded = jwt.verify(token, TEST_SECRET);

      expect(decoded).toEqual(
        expect.objectContaining({
          id: TEST_USER.id,
          email: TEST_USER.email,
          sub: TEST_USER.id,
          aud: "your-audience",
        })
      );
    });

    it("throws when JWT_SECRET is not configured", () => {
      delete process.env.JWT_SECRET;

      expect(() => generateAccessToken(TEST_USER)).toThrow("JWT_SECRETが設定されていません。");
    });
  });

  describe("generateRefreshToken", () => {
    it("generates a verifiable refresh token with expected payload fields", () => {
      const token = generateRefreshToken(TEST_USER);
      const decoded = jwt.verify(token, TEST_SECRET);

      expect(decoded).toEqual(
        expect.objectContaining({
          id: TEST_USER.id,
          email: TEST_USER.email,
          sub: TEST_USER.id,
          aud: "your-audience",
        })
      );
    });
  });

  describe("verifyToken", () => {
    it("returns the decoded payload for a valid token", async () => {
      const token = generateAccessToken(TEST_USER);

      await expect(verifyToken(token)).resolves.toEqual(
        expect.objectContaining({
          id: TEST_USER.id,
          email: TEST_USER.email,
          sub: TEST_USER.id,
          aud: "your-audience",
        })
      );
    });

    it("returns null for an invalid token", async () => {
      jest.spyOn(console, "error").mockImplementation(() => {});

      await expect(verifyToken("invalid-token")).resolves.toBeNull();
    });
  });

  describe("refreshAccessToken", () => {
    it("returns a new valid access token for a valid refresh token", async () => {
      const refreshToken = generateRefreshToken(TEST_USER);
      const accessToken = await refreshAccessToken(refreshToken);
      const decoded = jwt.verify(accessToken, TEST_SECRET);

      expect(decoded).toEqual(
        expect.objectContaining({
          id: TEST_USER.id,
          email: TEST_USER.email,
          sub: TEST_USER.id,
          aud: "your-audience",
        })
      );
    });

    it("throws for an invalid refresh token", async () => {
      jest.spyOn(console, "error").mockImplementation(() => {});

      await expect(refreshAccessToken("invalid-token")).rejects.toThrow(
        "Invalid or expired refresh token"
      );
    });
  });
});
