/** @jest-environment node */
const poison = { name: "POISON_NAME", message: "POISON_INTERNAL_TOKEN", code: "POISON_CODE", status: 500 };
jest.mock("../../utils/authUtils", () => ({ verifyToken: jest.fn(async () => ({ id: "synthetic-user" })) }));
jest.mock("../../utils/supabaseAdminClient", () => ({ getAdminDbClient: jest.fn(() => { throw poison; }) }));
jest.mock("../../utils/supabaseAuthClient", () => ({ createAuthClient: jest.fn(() => ({
  auth: { signUp: jest.fn(async () => { throw poison; }) },
})) }));
const notes = require("../noteService");
const { handleSignUp } = require("../authService");

test.each([
  [notes.getNotes, "Failed to fetch notes", "note_get"],
  [notes.saveNote, "Failed to save note", "note_save"],
  [notes.getNotesInRange, "Failed to fetch notes in range", "note_range"],
  [notes.getAllTags, "Failed to fetch all tags", "note_tags"],
  [notes.getNotesByTags, "Failed to fetch notes by tags", "note_by_tags"],
  [notes.createTag, "Failed to create tag", "tag_create"],
  [notes.deleteTag, "Failed to delete tag", "tag_delete"],
  [handleSignUp, "Failed to sign up user", "auth_signup"],
])("%p hides internal failure response and emits one safe event", async (handler, message, operation) => {
  const output = jest.spyOn(console, "error").mockImplementation(() => {});
  try {
    const res = { status: jest.fn(), json: jest.fn() };
    res.status.mockReturnValue(res);
    await handler({ headers: { authorization: "Bearer synthetic-authority" },
      params: { date: "2026-01-01", tagName: "test" }, query: { tags: "test" },
      body: { tag: "test", username: "Test", email: "fixture@example.invalid", password: "synthetic-password" } }, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: message });
    expect(output.mock.calls).toEqual([[JSON.stringify({ severity: "ERROR", event: "server_failure",
      operation, error: { name: "UnknownError", status: 500 } })]]);
  } finally { output.mockRestore(); }
});
