/** @jest-environment node */
const http = require("http");

jest.mock("dotenv", () => ({ config: jest.fn() }));
jest.mock("../utils/supabaseAdminClient", () => ({ getAdminDbClient: jest.fn() }));
jest.mock("../utils/supabaseAuthClient", () => ({ createAuthClient: jest.fn() }));
const { getAdminDbClient } = require("../utils/supabaseAdminClient");
const { createAuthClient } = require("../utils/supabaseAuthClient");
const app = require("../server");

let server;
const request = (method, path, body = "") => new Promise((resolve, reject) => {
  const req = http.request({ hostname: "127.0.0.1", port: server.address().port,
    method, path, headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) } }, (res) => {
    let text = "";
    res.on("data", (data) => { text += data; });
    res.on("end", () => resolve({ status: res.statusCode, headers: res.headers, text }));
  });
  req.on("error", reject);
  req.end(body);
});

beforeAll((done) => { server = app.listen(0, "127.0.0.1", done); });
afterAll((done) => { server.close(done); });
beforeEach(() => jest.clearAllMocks());
afterEach(() => {
  expect(getAdminDbClient).not.toHaveBeenCalled();
  expect(createAuthClient).not.toHaveBeenCalled();
});

test("health is fixed process-only JSON before parsing and without auth", async () => {
  const res = await request("GET", "/health", "{not-json");
  expect(res.status).toBe(200);
  expect(res.text).toBe('{"status":"ok"}');
  expect(res.headers["content-type"]).toMatch(/^application\/json/);
  expect(res.headers["cache-control"]).toBe("no-store");
});

test("HEAD health succeeds with no body", async () => {
  const res = await request("HEAD", "/health");
  expect(res.status).toBe(200);
  expect(res.text).toBe("");
});

test.each(["POST", "PUT", "PATCH", "DELETE"])("%s health is 405 before parsing", async (method) => {
  const res = await request(method, "/health", "{not-json");
  expect(res.status).toBe(405);
  expect(res.headers.allow).toBe("GET, HEAD");
});

test("global parse failure has a fixed response and one safe structured failure", async () => {
  const output = jest.spyOn(console, "error").mockImplementation(() => {});
  try {
    const res = await request("POST", "/not-an-application-route", "{POISON_BODY_TOKEN");
    expect(res.status).toBe(500);
    expect(res.text).toBe('{"error":"Internal Server Error"}');
    expect(output).toHaveBeenCalledTimes(1);
    expect(output.mock.calls[0]).toHaveLength(1);
    expect(JSON.parse(output.mock.calls[0][0])).toEqual({ severity: "ERROR", event: "server_failure",
      operation: "server_handler", error: { name: "SyntaxError", status: 400 } });
    expect(output.mock.calls[0][0]).not.toContain("POISON");
  } finally { output.mockRestore(); }
});
