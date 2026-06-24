/** @jest-environment node */

const verifyToken = jest.fn();
const from = jest.fn();

jest.mock("../../utils/authUtils", () => ({
  verifyToken,
}));

jest.mock("../../utils/supabaseClient", () => ({
  from,
}));

const { getNotes, saveNote, createTag, getNotesByTags } = require("../noteService");

const createResponse = () => {
  const res = {
    status: jest.fn(),
    json: jest.fn(),
  };
  res.status.mockReturnValue(res);
  return res;
};

describe("noteService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getNotes", () => {
    it("returns 401 when Authorization token is missing", async () => {
      const req = {
        params: { date: "2024-06-01" },
        headers: {},
      };
      const res = createResponse();

      await getNotes(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: "Authorization token missing" });
      expect(verifyToken).not.toHaveBeenCalled();
      expect(from).not.toHaveBeenCalled();
    });

    it("returns 401 when verifyToken returns null", async () => {
      verifyToken.mockResolvedValue(null);
      const req = {
        params: { date: "2024-06-01" },
        headers: { authorization: "Bearer invalid-token" },
      };
      const res = createResponse();

      await getNotes(req, res);

      expect(verifyToken).toHaveBeenCalledWith("invalid-token");
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: "Invalid token" });
      expect(from).not.toHaveBeenCalled();
    });

    it("returns notes for a valid token and successful Supabase query", async () => {
      const notes = [{ id: 1, date: "2024-06-01", note: "Bench press" }];
      const eqUserId = jest.fn().mockResolvedValue({ data: notes, error: null });
      const eqDate = jest.fn(() => ({ eq: eqUserId }));
      const select = jest.fn(() => ({ eq: eqDate }));
      from.mockReturnValue({ select });
      verifyToken.mockResolvedValue({ id: "user-123" });

      const req = {
        params: { date: "2024-06-01" },
        headers: { authorization: "Bearer valid-token" },
      };
      const res = createResponse();

      await getNotes(req, res);

      expect(from).toHaveBeenCalledWith("notes");
      expect(select).toHaveBeenCalledWith("*");
      expect(eqDate).toHaveBeenCalledWith("date", "2024-06-01");
      expect(eqUserId).toHaveBeenCalledWith("userid", "user-123");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ notes });
    });
  });

  describe("saveNote", () => {
    it("passes normalized exercises to Supabase upsert", async () => {
      const upsert = jest.fn().mockResolvedValue({ error: null });
      from.mockReturnValue({ upsert });
      verifyToken.mockResolvedValue({ id: "user-123" });
      const req = {
        params: { date: "2024-06-01" },
        headers: { authorization: "Bearer valid-token" },
        body: {
          note: "Bench day",
          tags: ["push"],
          exercises: JSON.stringify([
            {
              exercise: "Bench Press",
              sets: [
                {
                  weight: "100",
                  reps: "5",
                  rest: "120",
                  rpe: "8.5",
                  rir: "1",
                  failure: "false",
                },
                {
                  weight: "90",
                  reps: "8",
                  rest: "90",
                  rpe: "invalid",
                  rir: 11,
                  failure: "unknown",
                },
              ],
            },
          ]),
        },
      };
      const res = createResponse();

      await saveNote(req, res);

      expect(from).toHaveBeenCalledWith("notes");
      expect(upsert).toHaveBeenCalledWith(
        [
          {
            date: "2024-06-01",
            note: "Bench day",
            exercises: expect.any(String),
            tags: ["push"],
            userid: "user-123",
          },
        ],
        { onConflict: ["date", "userid"] }
      );

      const savedNote = upsert.mock.calls[0][0][0];
      expect(JSON.parse(savedNote.exercises)).toEqual([
        {
          exercise: "Bench Press",
          sets: [
            {
              weight: "100",
              reps: "5",
              rest: "120",
              rpe: 8.5,
              rir: 1,
              failure: false,
            },
            {
              weight: "90",
              reps: "8",
              rest: "90",
            },
          ],
        },
      ]);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ message: "Note saved successfully!" });
    });

    it("normalizes invalid exercises without crashing saveNote", async () => {
      const upsert = jest.fn().mockResolvedValue({ error: null });
      from.mockReturnValue({ upsert });
      verifyToken.mockResolvedValue({ id: "user-123" });
      const req = {
        params: { date: "2024-06-01" },
        headers: { authorization: "Bearer valid-token" },
        body: {
          note: "Invalid exercise payload",
          tags: [],
          exercises: "{not-json",
        },
      };
      const res = createResponse();

      await saveNote(req, res);

      expect(upsert.mock.calls[0][0][0].exercises).toBe("[]");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ message: "Note saved successfully!" });
    });
  });

  describe("createTag", () => {
    it("returns 400 when tag is missing", async () => {
      verifyToken.mockResolvedValue({ id: "user-123" });
      const req = {
        headers: { authorization: "Bearer valid-token" },
        body: {},
      };
      const res = createResponse();

      await createTag(req, res);

      expect(verifyToken).toHaveBeenCalledWith("valid-token");
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: "Tag is required" });
      expect(from).not.toHaveBeenCalled();
    });
  });

  describe("getNotesByTags", () => {
    it("returns an empty notes array when query.tags is missing", async () => {
      verifyToken.mockResolvedValue({ id: "user-123" });
      const req = {
        headers: { authorization: "Bearer valid-token" },
        query: {},
      };
      const res = createResponse();

      await getNotesByTags(req, res);

      expect(verifyToken).toHaveBeenCalledWith("valid-token");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ notes: [] });
      expect(from).not.toHaveBeenCalled();
    });
  });
});
