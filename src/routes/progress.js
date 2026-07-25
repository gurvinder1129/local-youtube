const express = require('express');
const { load, save } = require('../lib/db');

const router = express.Router();

const COMPLETE_THRESHOLD = 0.92;

router.post('/', (req, res) => {
  const { videoPath, position, duration } = req.body;
  if (!videoPath || typeof position !== 'number' || typeof duration !== 'number' || duration <= 0) {
    return res.status(400).json({ error: 'videoPath, position and duration are required' });
  }

  const db = load();
  const existing = db.progress[videoPath] || {};
  const completed = existing.completed || position / duration >= COMPLETE_THRESHOLD;

  db.progress[videoPath] = {
    position: completed ? existing.position || position : position,
    duration,
    completed,
    lastWatched: new Date().toISOString(),
  };
  save(db);
  res.json({ ok: true, progress: db.progress[videoPath] });
});

router.post('/toggle', (req, res) => {
  const { videoPath } = req.body;
  if (!videoPath) return res.status(400).json({ error: 'videoPath is required' });

  const db = load();
  const existing = db.progress[videoPath] || { position: 0, duration: 0 };
  const completed = !existing.completed;
  db.progress[videoPath] = {
    ...existing,
    completed,
    position: completed ? existing.duration || existing.position : 0,
    lastWatched: new Date().toISOString(),
  };
  save(db);
  res.json({ ok: true, progress: db.progress[videoPath] });
});

module.exports = router;
