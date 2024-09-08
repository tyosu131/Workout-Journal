require('dotenv').config({ path: './.env.local' });
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const supabase = require('./supabaseClient');

const server = express();

// CORS設定
const corsOptions = {
  origin: '*', // 必要に応じてオリジンを限定する
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
};

server.use(cors(corsOptions));
server.use(express.json());
server.use(cookieParser());

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

// トークン発行関数
const generateAccessToken = (user) => {
  return jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '1h' });
};

// リフレッシュトークン発行関数
const generateRefreshToken = (user) => {
  return jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

// ユーザー登録API
server.post('/api/signup', async (req, res) => {
  const { name, email, password } = req.body;

  if (!validateEmail(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  try {
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (existingUser) {
      return res.status(409).json({ error: 'Email already exists' });
    }

    const { data, error } = await supabase
      .from('users')
      .insert([{ name, email, password }])
      .select();

    if (error) throw error;

    if (!data || !data[0]) {
      return res.status(500).json({ error: 'Failed to create user' });
    }

    const token = generateAccessToken(data[0]);
    const refreshToken = generateRefreshToken(data[0]);

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'Strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

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

    const token = generateAccessToken(session.user);
    const refreshToken = generateRefreshToken(session.user);

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'Strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(200).json({ token, user: session.user });
  } catch (error) {
    console.error('Login failed:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// トークンリフレッシュAPI
server.post('/api/refresh-token', (req, res) => {
  const refreshToken = req.cookies.refreshToken;
  if (!refreshToken) {
    return res.status(403).json({ error: 'Refresh token not provided' });
  }

  jwt.verify(refreshToken, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid refresh token' });
    }

    const newToken = generateAccessToken(user);
    res.status(200).json({ token: newToken });
  });
});

// ミドルウェアで認証
const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
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

    if (error) throw new Error(`Supabase error: ${error.message}`);

    if (!data || data.length === 0) {
      return res.json([]);
    }

    res.json(data);
  } catch (error) {
    console.error('Failed to fetch note:', error);
    res.status(500).json({ error: 'Failed to fetch note' });
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

    if (error) throw new Error(`Supabase error: ${error.message}`);

    res.status(200).json({ message: 'Note saved successfully' });
  } catch (error) {
    console.error('Failed to save note:', error);
    res.status(500).json({ error: 'Failed to save note' });
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
