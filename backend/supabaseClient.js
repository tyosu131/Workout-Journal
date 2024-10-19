const { createClient } = require('@supabase/supabase-js');

// 環境変数からSupabase URLとKeyを取得
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

console.log("Supabase URL:", supabaseUrl);  // 確認用ログ
console.log("Supabase Key:", supabaseKey);  // 確認用ログ

// URLまたはキーが設定されていない場合にエラーメッセージを出す
if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase URL or Key is missing from environment variables.');
  throw new Error('Supabase URL and Key must be set in the environment variables');
}

// Supabaseクライアントを作成
const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = supabase;
