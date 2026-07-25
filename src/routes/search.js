const express = require('express');
const { load, resolvePlaylistFolders, progressFor } = require('../lib/playlists');
const { listVideos } = require('../lib/scanner');

const router = express.Router();

router.get('/', (req, res) => {
  const q = (req.query.q || '').trim().toLowerCase();
  if (!q) return res.json({ query: '', results: [] });

  const db = load();
  const folders = resolvePlaylistFolders(db);
  const results = [];

  for (const entry of folders) {
    const playlistMatches = entry.name.toLowerCase().includes(q);
    const videos = listVideos(entry.path)
      .filter((v) => playlistMatches || v.name.toLowerCase().includes(q))
      .map((v) => ({ ...v, progress: progressFor(db, v.path) }));

    if (videos.length) {
      results.push({ playlistPath: entry.path, playlistName: entry.name, videos });
    }
  }

  res.json({ query: q, results });
});

module.exports = router;
