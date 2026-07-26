import { API_ENDPOINTS } from "../endpoints";

describe("API_ENDPOINTS", () => {
  it("matches the Express auth and notes mounts without a Next.js /api prefix", () => {
    expect(API_ENDPOINTS.LOGIN).toBe("/auth/login");
    expect(API_ENDPOINTS.SIGNUP).toBe("/auth/signup");
    expect(API_ENDPOINTS.SESSION).toBe("/auth/session");
    expect(API_ENDPOINTS.REFRESH).toBe("/auth/refresh");
    expect(API_ENDPOINTS.NOTES("2026-07-26")).toBe("/notes/2026-07-26");
    expect(API_ENDPOINTS.NOTES_RANGE("2026-07-01", "2026-07-26")).toBe(
      "/notes/range?start=2026-07-01&end=2026-07-26"
    );
    expect(API_ENDPOINTS.NOTES_ALL_TAGS).toBe("/notes/all-tags");
    expect(API_ENDPOINTS.NOTES_BY_TAGS).toBe("/notes/by-tags");
    expect(API_ENDPOINTS.NOTES_TAG).toBe("/notes/tag");

    const staticEndpoints = Object.values(API_ENDPOINTS).filter(
      (endpoint): endpoint is string => typeof endpoint === "string"
    );
    expect(staticEndpoints.every((endpoint) => !endpoint.startsWith("/api/"))).toBe(true);
  });
});
