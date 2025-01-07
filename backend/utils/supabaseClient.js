const { createClient } = require("@supabase/supabase-js");

// フロントエンド用の環境変数からSupabase URLとKeyを取得
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_KEY;

// 環境変数の値をコンソールに出力して確認
console.log("Supabase URL:", supabaseUrl);
console.log("Supabase Key:", supabaseKey ? "*****" : "Not found");

// 明示的に変数で定義したものを渡す
if (!supabaseUrl || !supabaseKey) {
  console.error("Supabase URL or Key is missing from environment variables.");
  throw new Error("Supabase URL and Key must be set in the environment variables");
}

const clientUrl = supabaseUrl; // 明示的に定義
const clientKey = supabaseKey; // 明示的に定義

// 変数で定義した値をcreateClientに渡す
const supabase = createClient(clientUrl, clientKey);

console.log("Supabase Client initialized:", supabase);

module.exports = supabase;
