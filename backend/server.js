const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const cors = require('cors');

// データベースの初期化
const initDb = async () => {
  const db = await open({
    filename: './database.sqlite',
    driver: sqlite3.Database
  });

  await db.exec('CREATE TABLE IF NOT EXISTS notes (date TEXT PRIMARY KEY, note TEXT, exercises TEXT)');
  console.log('Database initialized');

  return db;
};

let db;
const setupServer = async () => {
  db = await initDb();

  const server = express();
  server.use(cors());
  server.use(express.json());

  // 日付形式のバリデーション
  const isValidDate = (date) => {
    return /\d{4}-\d{2}-\d{2}/.test(date);
  };

  // API Routes
  server.get('/api/notes/:date', async (req, res) => {
    const { date } = req.params;
    if (!isValidDate(date)) {
      return res.status(400).json({ error: 'Invalid date format' });
    }

    try {
      console.log(`Fetching note for date: ${date}`);
      const note = await db.get('SELECT * FROM notes WHERE date = ?', [date]);
      if (note) {
        console.log('Fetched note:', note);
        res.json(note);
      } else {
        console.log('No note found for date:', date);
        res.status(404).json({ error: 'Note not found' });
      }
    } catch (error) {
      console.error('Failed to fetch note', error);
      res.status(500).json({ error: 'Failed to fetch note' });
    }
  });

  server.post('/api/notes/:date', async (req, res) => {
    const { date } = req.params;
    const { note, exercises } = req.body;

    if (!isValidDate(date)) {
      return res.status(400).json({ error: 'Invalid date format' });
    }

    console.log(`Saving note for date: ${date}`);
    console.log('Note data:', req.body);
    try {
      await db.run('INSERT OR REPLACE INTO notes (date, note, exercises) VALUES (?, ?, ?)', [date, note, JSON.stringify(exercises)]);
      console.log('Note saved successfully');
      res.status(200).json({ message: 'Note saved successfully' });
    } catch (error) {
      console.error('Failed to save note', error);
      res.status(500).json({ error: 'Failed to save note' });
    }
  });

  const port = process.env.PORT || 3001;
  server.listen(port, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://localhost:${port}`);
  });
};

setupServer();
