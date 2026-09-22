/** @jest-environment node */
const { logFailure } = require("../structuredLogger");

let output;
beforeEach(() => { output = jest.spyOn(console, "error").mockImplementation(() => {}); });
afterEach(() => output.mockRestore());

test("one exact JSON stderr argument, fixed event and approved operation", () => {
  logFailure("note_save", { name: "Error", status: 500 });
  expect(output.mock.calls).toEqual([[JSON.stringify({ severity: "ERROR", event: "server_failure",
    operation: "note_save", error: { name: "Error", status: 500 } })]]);
});

test("poisoned fields and arbitrary operation/name/code never escape", () => {
  logFailure("POISON_OPERATION", { name: "POISON_NAME", code: "POISON_CODE",
    message: "POISON_TOKEN", stack: "POISON_CREDENTIAL", email: "POISON_EMAIL", uuid: "POISON_UUID",
    Authorization: "POISON_AUTHORIZATION", url: "POISON_URL", nested: { secret: "POISON_SECRET" } });
  expect(JSON.parse(output.mock.calls[0][0])).toEqual({ severity: "ERROR", event: "server_failure",
    operation: "unknown_operation", error: { name: "UnknownError" } });
  expect(output.mock.calls[0][0]).not.toContain("POISON");
});

test.each([399, 600, 500.5, NaN, Infinity, "500", null, undefined])("unsafe status %s is omitted", (status) => {
  logFailure("server_handler", { name: "Error", status });
  expect(JSON.parse(output.mock.calls[0][0]).error).toEqual({ name: "Error" });
});

test.each([400, 599])("boundary status %s survives exactly", (status) => {
  logFailure("server_handler", { name: "Error", status });
  expect(JSON.parse(output.mock.calls[0][0]).error).toEqual({ name: "Error", status });
});

test.each([null, undefined, "POISON_INPUT", 42])("non-Error input is safe", (error) => {
  logFailure("weekly_summary", error);
  expect(JSON.parse(output.mock.calls[0][0]).error).toEqual({ name: "UnknownError" });
});

test("throwing exception properties do not obscure the failure", () => {
  logFailure("server_handler", { get name() { throw new Error("POISON_GETTER"); } });
  expect(JSON.parse(output.mock.calls[0][0]).error).toEqual({ name: "UnknownError" });
});
