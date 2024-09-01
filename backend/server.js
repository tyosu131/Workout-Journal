require('dotenv').config({ path: './.env.local' });
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const supabase = require('./supabaseClient');

const server = express();

// CORS設定
const corsOptions = {
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
};

server.use(cors(corsOptions));
server.use(express.json());

// JWT_SECRETの確認
if (!process.env.JWT_SECRET) {
  console.error('JWT_SECRET is not set. Please set it in your .env.local file.');
  process.exit(1);
}

// メールアドレスの形式を検証する関数
const validateEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

// ユーザー登録API
server.post('/api/signup', async (req, res) => {
  const { name, email, password } = req.body;

  if (!validateEmail(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  try {
    // Supabaseから既存ユーザーをチェック
    const { data: existingUser, error: selectError } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (existingUser) {
      return res.status(409).json({ error: 'Email already exists' });
    }

    // 新規ユーザーをSupabaseに挿入
    const { data, error } = await supabase
      .from('users')
      .insert([{ name, email, password }])
      .select();

    if (error) {
      throw error;
    }

    if (!data || !data[0]) {
      console.error('No data returned after insert');
      return res.status(500).json({ error: 'Failed to create user' });
    }

    // JWTトークンを生成
    const token = jwt.sign({ id: data[0].id, email: data[0].email }, process.env.JWT_SECRET);
    res.status(201).json({ token });
  } catch (error) {
    console.error('Failed to create user:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// ログインAPI
server.post('/api/login', async (req, res) => {
  const { email, password } = req.body;

  if (!validateEmail(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  try {
    const { session, error } = await supabase.auth.signIn({
      email,
      password,
    });

    if (error || !session || !session.user) {
      return res.status(500).json({ error: 'Failed to login: ' + (error?.message || 'Unknown error') });
    }

    const token = jwt.sign({ id: session.user.id, email: session.user.email }, process.env.JWT_SECRET);
    res.status(200).json({ token, user: session.user });
  } catch (error) {
    console.error('Login failed:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// パスワードリセットリクエストAPI
server.post('/api/forgot-password', async (req, res) => {
  const { email } = req.body;

  if (!validateEmail(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'Email not found' });
    }

    const resetToken = jwt.sign({ id: data.id, email: data.email }, process.env.JWT_SECRET, { expiresIn: '1h' });
    console.log(`Password reset link: http://localhost:3000/reset-password?token=${resetToken}`);
    res.json({ message: 'Password reset link sent to your email.' });
  } catch (error) {
    console.error('Failed to request password reset:', error);
    res.status(500).json({ error: 'Failed to request password reset' });
  }
});

// ミドルウェアで認証
const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    console.log('No token provided');
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err || !user || !user.id) {
      console.error('Invalid token or user:', err);
      return res.status(403).json({ error: 'Invalid token or user' });
    }
    req.user = user;
    next();
  });
};

// ノート取得API
server.get('/api/notes/:date', authenticate, async (req, res) => {
  const { date } = req.params;

  if (!isValidDate(date)) {
    return res.status(400).json({ error: 'Invalid date format' });
  }

  try {
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .eq('date', date)
      .eq('userid', req.user.id);

    if (error) {
      throw new Error(`Supabase error: ${error.message}`);
    }

    // ノートが存在しない場合は空の配列を返す
    if (!data || data.length === 0) {
      return res.json([]);
    }

    res.json(data);
  } catch (error) {
    console.error('Failed to fetch note:', error);
    res.status(500).json({ error: 'Failed to fetch note: ' + error.message });
  }
});

// ノート保存API
server.post('/api/notes/:date', authenticate, async (req, res) => {
  const { date } = req.params;
  const { note, exercises } = req.body;

  if (!isValidDate(date)) {
    return res.status(400).json({ error: 'Invalid date format' });
  }

  try {
    const { error } = await supabase
      .from('notes')
      .upsert([{ date, note, exercises: JSON.stringify(exercises), userid: req.user.id }]);

    if (error) {
      throw new Error(`Supabase error: ${error.message}`);
    }

    res.status(200).json({ message: 'Note saved successfully' });
  } catch (error) {
    console.error('Failed to save note:', error);
    res.status(500).json({ error: 'Failed to save note: ' + error.message });
  }
});

// 日付の検証関数
const isValidDate = (date) => {
  const re = /^\d{4}-\d{2}-\d{2}$/;
  return re.test(date);
};

const port = process.env.PORT || 3001;
server.listen(port, (err) => {
  if (err) throw err;
  console.log(`> Ready on http://localhost:${port}`);
});
