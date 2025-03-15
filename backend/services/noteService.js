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

    // date & userid で検索
    const { data, error } = await supabase
      .from("notes")
      .select("*")
      .eq("date", date)
      .eq("userid", user.id);

    if (error) throw error;

    // 取得した notes を返す
    res.status(200).json({ notes: data });
  } catch (error) {
    console.error("Failed to fetch notes:", error.message);
    res.status(500).json({ error: "Failed to fetch notes", details: error.message });
  }
}

/**
 * POST /api/notes/:date
 * ノートをアップサート (作成/更新)
 * → DB の `tags` カラムが `text[]` の場合、フロントから `tags` は配列で送信される想定
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

    // フロントから受け取るリクエストボディ
    const { note, exercises, tags } = req.body;
    // ここで tags は string[] (配列) を想定

    const { error } = await supabase
      .from("notes")
      .upsert(
        [
          {
            date,
            note,
            exercises, // exercises も配列として保存したい場合はフロントエンドでそのまま送信
            tags,      // text[] カラムにそのまま保存
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
 * ユーザーが持っているすべてのタグを返す
 * DB の `tags` カラムが `text[]` だが、要素が JSON文字列の場合にも対応
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

    const { data, error } = await supabase
      .from("notes")
      .select("tags")
      .eq("userid", user.id);

    if (error) throw error;

    const allTagsSet = new Set();

    data.forEach((row) => {
      console.log("row.tags raw =>", row.tags); 
      if (row.tags) {
        row.tags.forEach((tagItem) => {
          if (typeof tagItem === "string") {
            try {
              const parsed = JSON.parse(tagItem);
              if (Array.isArray(parsed)) {
                parsed.forEach((p) => allTagsSet.add(p));
              } else {
                allTagsSet.add(tagItem);
              }
            } catch (err) {
              allTagsSet.add(tagItem);
            }
          } else {
            // 文字列でなければそのまま追加
            allTagsSet.add(tagItem);
          }
        });
      }
    });

    // 重複を除いたタグ一覧
    const allTags = Array.from(allTagsSet);
    res.status(200).json({ tags: allTags });
  } catch (error) {
    console.error("Failed to fetch all tags:", error.message);
    res.status(500).json({ error: "Failed to fetch all tags", details: error.message });
  }
}


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

    // カンマ区切りを配列に
    const tagArray = tags.split(",").map((t) => t.trim());

    // text[] カラムなら overlaps でフィルタできる
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

module.exports = {
  getNotes,
  saveNote,
  getAllTags,
  getNotesByTags,
};
