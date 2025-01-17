const { createClient } = require("@supabase/supabase-js");

// 環境変数を直接参照（server.jsでrequire("dotenv").configがすでに実行されている）
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

// 環境変数の確認ログ
console.log("Supabase URL:", supabaseUrl);
console.log("Supabase Key:", supabaseKey ? "*****" : "Not found");

// エラーチェック
if (!supabaseUrl || !supabaseKey) {
  console.error("Supabase URL or Key is missing from environment variables.");
  throw new Error("Supabase URL and Key must be set in the environment variables");
}

// Supabaseクライアントを初期化
const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = supabase;
