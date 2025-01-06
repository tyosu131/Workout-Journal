const { createClient } = require("@supabase/supabase-js");

// フロントエンド用の環境変数からSupabase URLとKeyを取得
// const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
// const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_KEY;

// console.log("Supabase URL:", supabaseUrl);
// console.log("Supabase Key:", supabaseKey ? "*****" : "Not found");

// if (!supabaseUrl || !supabaseKey) {
//   console.error("Supabase URL or Key is missing from environment variables.");
//   throw new Error("Supabase URL and Key must be set in the environment variables");
// }

// const supabase = createClient(supabaseUrl, supabaseKey);

// module.exports = supabase;
