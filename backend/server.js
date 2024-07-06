const express = require('express');
const next = require('next');
const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const { createServer } = require('http');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

const initDb = async () => {
  const db = await open({
    filename: './database.sqlite',
    driver: sqlite3.Database
  });

  await db.exec('CREATE TABLE IF NOT EXISTS notes (date TEXT PRIMARY KEY, note TEXT, exercises TEXT)');

  return db;
};

let db;
app.prepare().then(async () => {
  db = await initDb();

  const server = express();
  server.use(express.json());

  server.get('/api/notes/:date', async (req, res) => {
    try {
      const note = await db.get('SELECT * FROM notes WHERE date = ?', [req.params.date]);
      res.json(note);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch note' });
    }
  });

  server.post('/api/notes/:date', async (req, res) => {
    const { note, exercises } = req.body;
    try {
      await db.run('INSERT OR REPLACE INTO notes (date, note, exercises) VALUES (?, ?, ?)', [req.params.date, note, JSON.stringify(exercises)]);
      res.status(200).json({ message: 'Note saved successfully' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to save note' });
    }
  });

  server.all('*', (req, res) => {
    return handle(req, res);
  });

  const port = process.env.PORT || 3001;
  createServer(server).listen(port, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://localhost:${port}`);
  });
});
