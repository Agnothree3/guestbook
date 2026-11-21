const path = require('path');
const express = require('express');
const { DatabaseSync } = require('node:sqlite');

const app = express();
const PORT = process.env.PORT || 3000;

const db = new DatabaseSync(path.join(__dirname, 'guestbook.db'));
db.exec(`PRAGMA journal_mode = WAL`);
db.exec(`
  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    text TEXT NOT NULL,
    time TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
  )
`);

app.use(express.json({ limit: '64kb' }));
app.use(express.static(__dirname, { index: 'guestbook.html' }));

function sanitize(s, max) {
  return String(s || '').trim().slice(0, max);
}

// 获取全部留言，最新的在前
app.get('/api/messages', (req, res) => {
  const rows = db.prepare('SELECT * FROM messages ORDER BY id DESC').all();
  res.json(rows);
});

// 发表留言
app.post('/api/messages', (req, res) => {
  const name = sanitize(req.body.name, 20);
  const text = sanitize(req.body.text, 500);
  if (!name || !text) {
    return res.status(400).json({ error: '昵称和留言都不能为空' });
  }
  const info = db.prepare('INSERT INTO messages (name, text) VALUES (?, ?)').run(name, text);
  const row = db.prepare('SELECT * FROM messages WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json(row);
});

// 删除留言
app.delete('/api/messages/:id', (req, res) => {
  const info = db.prepare('DELETE FROM messages WHERE id = ?').run(Number(req.params.id));
  if (info.changes === 0) return res.status(404).json({ error: '留言不存在' });
  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`留言板已启动：http://localhost:${PORT}`);
});
