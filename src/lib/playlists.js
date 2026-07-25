const path = require('path');
const { load, save } = require('./db');
const { listSubfolders, listVideos, folderExists } = require('./scanner');

// Expands the configured roots + manually-added folders into a flat list of
// playlist folders that currently exist on disk, deduplicated by path.
function resolvePlaylistFolders(db) {
  const seen = new Map();

  for (const root of db.roots) {
    if (!folderExists(root)) continue;
    for (const sub of listSubfolders(root)) {
      seen.set(sub, { path: sub, name: path.basename(sub), source: 'root', rootPath: root });
    }
  }

  for (const p of db.playlists) {
    if (!folderExists(p)) continue;
    if (!seen.has(p)) {
      seen.set(p, { path: p, name: path.basename(p), source: 'manual' });
    }
  }

  return [...seen.values()].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
}

function progressFor(db, videoPath) {
  return db.progress[videoPath] || { position: 0, duration: 0, completed: false, lastWatched: null };
}

function playlistSummary(db, entry) {
  const videos = listVideos(entry.path);
  const completed = videos.filter((v) => progressFor(db, v.path).completed).length;
  return {
    path: entry.path,
    name: entry.name,
    source: entry.source,
    videoCount: videos.length,
    completedCount: completed,
    percentComplete: videos.length ? Math.round((completed / videos.length) * 100) : 0,
    firstVideoPath: videos.length ? [...videos].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))[0].path : null,
  };
}

module.exports = { resolvePlaylistFolders, progressFor, playlistSummary, load, save };
