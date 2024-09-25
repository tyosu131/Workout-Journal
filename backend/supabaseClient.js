const { createClient } = require('@supabase/supabase-js');

// 環境変数から Supabase URL と Key を取得
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY || process.env.NEXT_PUBLIC_SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Supabase URL and Key must be set in the environment variables');
}

// Supabase クライアントを作成
const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = supabase;
