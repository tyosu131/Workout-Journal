import { API_ENDPOINTS } from "../endpoints";

describe("API_ENDPOINTS", () => {
  it("uses the browser-facing same-origin /api namespace", () => {
    expect(API_ENDPOINTS.LOGIN).toBe("/api/auth/login");
    expect(API_ENDPOINTS.SIGNUP).toBe("/api/auth/signup");
    expect(API_ENDPOINTS.LOGOUT).toBe("/api/auth/logout");
    expect(API_ENDPOINTS.SESSION).toBe("/api/auth/session");
    expect(API_ENDPOINTS.REFRESH).toBe("/api/auth/refresh");
    expect(API_ENDPOINTS.NOTES("2026-07-26")).toBe("/api/notes/2026-07-26");
    expect(API_ENDPOINTS.NOTES_RANGE("2026-07-01", "2026-07-26")).toBe(
      "/api/notes/range?start=2026-07-01&end=2026-07-26"
    );
    expect(API_ENDPOINTS.NOTES_ALL_TAGS).toBe("/api/notes/all-tags");
    expect(API_ENDPOINTS.NOTES_BY_TAGS).toBe("/api/notes/by-tags");
    expect(API_ENDPOINTS.NOTES_TAG).toBe("/api/notes/tag");

    const staticEndpoints = Object.values(API_ENDPOINTS).filter(
      (endpoint): endpoint is string => typeof endpoint === "string"
    );
    expect(staticEndpoints.every((endpoint) => endpoint.startsWith("/api/"))).toBe(true);
  });
});
