const express = require('express');
const { load, save, resolvePlaylistFolders, playlistSummary, progressFor } = require('../lib/playlists');
const { listVideos, sortVideos, folderExists } = require('../lib/scanner');

const router = express.Router();

router.get('/', (req, res) => {
  const db = load();
  const folders = resolvePlaylistFolders(db);
  res.json({
    roots: db.roots,
    playlists: folders.map((entry) => playlistSummary(db, entry)),
  });
});

router.post('/root', (req, res) => {
  const { path: dirPath } = req.body;
  if (!dirPath || !folderExists(dirPath)) {
    return res.status(400).json({ error: 'Folder does not exist' });
  }
  const db = load();
  if (!db.roots.includes(dirPath)) {
    db.roots.push(dirPath);
    save(db);
  }
  res.json({ ok: true });
});

router.post('/single', (req, res) => {
  const { path: dirPath } = req.body;
  if (!dirPath || !folderExists(dirPath)) {
    return res.status(400).json({ error: 'Folder does not exist' });
  }
  const db = load();
  if (!db.playlists.includes(dirPath)) {
    db.playlists.push(dirPath);
    save(db);
  }
  res.json({ ok: true });
});

router.delete('/', (req, res) => {
  const { path: dirPath, type } = req.query;
  const db = load();
  if (type === 'root') {
    db.roots = db.roots.filter((p) => p !== dirPath);
  } else {
    db.playlists = db.playlists.filter((p) => p !== dirPath);
  }
  save(db);
  res.json({ ok: true });
});

router.get('/videos', (req, res) => {
  const { path: dirPath, sort } = req.query;
  if (!dirPath || !folderExists(dirPath)) {
    return res.status(400).json({ error: 'Playlist folder not found' });
  }

  const db = load();
  const sortKey = sort || db.sortPrefs[dirPath] || 'name-asc';
  if (sort && db.sortPrefs[dirPath] !== sort) {
    db.sortPrefs[dirPath] = sort;
    save(db);
  }

  const videos = sortVideos(listVideos(dirPath), sortKey)
    .map((v) => ({ ...v, progress: progressFor(db, v.path) }));

  res.json({ path: dirPath, sort: sortKey, videos });
});

module.exports = router;
