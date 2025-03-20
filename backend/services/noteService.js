// portfolio real\backend\services\noteService.js
const supabase = require("../utils/supabaseClient");
const { verifyToken } = require("../utils/authUtils");

/**
 * GET /api/notes/:date
 * ユーザーの特定日付のノートを取得
 */
async function getNotes(req, res) {
  const { date } = req.params;
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    return res.status(401).json({ error: "Authorization token missing" });
  }
  try {
    const user = await verifyToken(token);
    if (!user || !user.id) {
      return res.status(401).json({ error: "Invalid token" });
    }
    const { data, error } = await supabase
      .from("notes")
      .select("*")
      .eq("date", date)
      .eq("userid", user.id);
    if (error) throw error;
    res.status(200).json({ notes: data });
  } catch (error) {
    console.error("Failed to fetch notes:", error.message);
    res.status(500).json({ error: "Failed to fetch notes", details: error.message });
  }
}

/**
 * POST /api/notes/:date
 * ノートをアップサート（作成/更新）
 */
async function saveNote(req, res) {
  const { date } = req.params;
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    return res.status(401).json({ error: "Authorization token missing" });
  }
  try {
    const user = await verifyToken(token);
    if (!user || !user.id) {
      return res.status(401).json({ error: "Invalid token" });
    }
    const { note, exercises, tags } = req.body;
    const { error } = await supabase
      .from("notes")
      .upsert(
        [
          {
            date,
            note,
            exercises,
            tags,
            userid: user.id,
          },
        ],
        { onConflict: ["date", "userid"] }
      );
    if (error) throw error;
    res.status(200).json({ message: "Note saved successfully!" });
  } catch (error) {
    console.error("Failed to save note:", error.message);
    res.status(500).json({ error: "Failed to save note", details: error.message });
  }
}

/**
 * GET /api/notes/all-tags
 * ユーザーが持つすべてのタグを返す
 */
async function getAllTags(req, res) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    return res.status(401).json({ error: "Authorization token missing" });
  }
  try {
    const user = await verifyToken(token);
    if (!user || !user.id) {
      return res.status(401).json({ error: "Invalid token" });
    }
    // user_tagsテーブルから取得
    const { data, error } = await supabase
      .from("user_tags")
      .select("tag")
      .eq("user_id", user.id);
    if (error) throw error;
    // user_tags テーブルの "tag" カラムを配列化
    const allTags = data.map((row) => row.tag);
    res.status(200).json({ tags: allTags });
  } catch (error) {
    console.error("Failed to fetch all tags:", error.message);
    res.status(500).json({ error: "Failed to fetch all tags", details: error.message });
  }
}

/**
 * GET /api/notes/by-tags?tags=tag1,tag2
 * 指定したタグを含むノート一覧を取得
 */
async function getNotesByTags(req, res) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    return res.status(401).json({ error: "Authorization token missing" });
  }
  try {
    const user = await verifyToken(token);
    if (!user || !user.id) {
      return res.status(401).json({ error: "Invalid token" });
    }
    const { tags } = req.query;
    if (!tags) {
      return res.status(200).json({ notes: [] });
    }
    const tagArray = tags.split(",").map((t) => t.trim());
    const { data, error } = await supabase
      .from("notes")
      .select("*")
      .eq("userid", user.id)
      .overlaps("tags", tagArray);
    if (error) throw error;
    res.status(200).json({ notes: data });
  } catch (error) {
    console.error("Failed to fetch notes by tags:", error.message);
    res.status(500).json({ error: "Failed to fetch notes by tags", details: error.message });
  }
}

/**
 * POST /api/notes/tag
 * タグを新規作成（DBに保存）
 */
async function createTag(req, res) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    return res.status(401).json({ error: "Authorization token missing" });
  }
  try {
    const user = await verifyToken(token);
    if (!user || !user.id) {
      return res.status(401).json({ error: "Invalid token" });
    }
    const { tag } = req.body;
    if (!tag) {
      return res.status(400).json({ error: "Tag is required" });
    }
    const { error } = await supabase
      .from("user_tags")
      .insert({ user_id: user.id, tag });
    if (error) {
      if (error.code === "23505") {
        return res.status(409).json({ error: "Tag already exists" });
      }
      throw error;
    }
    res.status(201).json({ message: "Tag created" });
  } catch (err) {
    console.error("Failed to create tag:", err.message);
    res.status(500).json({ error: "Failed to create tag", details: err.message });
  }
}

/**
 * DELETE /api/notes/tag/:tagName
 * タグを削除（user_tagsテーブルから削除）し、notesテーブルのtags配列からも除去する
 */
async function deleteTag(req, res) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    return res.status(401).json({ error: "Authorization token missing" });
  }
  try {
    const user = await verifyToken(token);
    if (!user || !user.id) {
      return res.status(401).json({ error: "Invalid token" });
    }
    const { tagName } = req.params;
    if (!tagName) {
      return res.status(400).json({ error: "Tag name is required" });
    }
    const decodedTag = decodeURIComponent(tagName);

    const { error } = await supabase
      .from("user_tags")
      .delete()
      .eq("user_id", user.id)
      .eq("tag", decodedTag);
    if (error) throw error;

    const { data: notesData, error: selectError } = await supabase
      .from("notes")
      .select("date, tags")
      .eq("userid", user.id)
      .contains("tags", [decodedTag]);
    if (selectError) throw selectError;
    if (notesData && notesData.length > 0) {
      for (const noteRow of notesData) {
        const updatedTags = (noteRow.tags || []).filter((t) => t !== decodedTag);
        const { error: updateError } = await supabase
          .from("notes")
          .update({ tags: updatedTags })
          .eq("date", noteRow.date)
          .eq("userid", user.id);
        if (updateError) throw updateError;
      }
    }

    res.status(200).json({ message: "Tag deleted" });
  } catch (err) {
    console.error("Failed to delete tag:", err.message);
    res.status(500).json({ error: "Failed to delete tag", details: err.message });
  }
}

module.exports = {
  getNotes,
  saveNote,
  getAllTags,
  getNotesByTags,
  createTag,
  deleteTag,
};
