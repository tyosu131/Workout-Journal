const supabase = require("../utils/supabaseClient");
const { verifyToken } = require("../utils/authUtils");

async function getNotes(req, res) {
  const { date } = req.params;
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) return res.status(401).json({ error: "Authorization token missing" });

  try {
    const user = await verifyToken(token);
    if (!user || !user.id) return res.status(401).json({ error: "Invalid token" });

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

async function saveNote(req, res) {
  const { date } = req.params;
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) return res.status(401).json({ error: "Authorization token missing" });

  try {
    const user = await verifyToken(token);
    if (!user || !user.id) return res.status(401).json({ error: "Invalid token" });

    const { note, exercises } = req.body;
    const { error } = await supabase
      .from("notes")
      .upsert([{ date, note, exercises, userid: user.id }], { onConflict: ["date", "userid"] });

    if (error) throw error;

    res.status(200).json({ message: "Note saved successfully!" });
  } catch (error) {
    console.error("Failed to save note:", error.message);
    res.status(500).json({ error: "Failed to save note", details: error.message });
  }
}

module.exports = { getNotes, saveNote };
