const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

const DEFAULT_DB = {
  roots: [],       // folders whose immediate subfolders are each treated as a playlist
  playlists: [],   // individually added playlist folders
  sortPrefs: {},   // { [playlistPath]: 'name-asc' | 'name-desc' | 'date-asc' | 'date-desc' }
  progress: {},    // { [videoPath]: { position, duration, completed, lastWatched } }
};

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function load() {
  ensureDataDir();
  if (!fs.existsSync(DB_FILE)) {
    save(DEFAULT_DB);
    return { ...DEFAULT_DB };
  }
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_DB, ...parsed };
  } catch (err) {
    console.error('Failed to read db.json, starting fresh:', err.message);
    return { ...DEFAULT_DB };
  }
}

function save(db) {
  ensureDataDir();
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
}

module.exports = { load, save, DATA_DIR };
