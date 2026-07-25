const express = require('express');
const fs = require('fs');
const path = require('path');

const router = express.Router();

function listWindowsDrives() {
  const drives = [];
  for (let code = 65; code <= 90; code++) {
    const letter = String.fromCharCode(code);
    const drivePath = `${letter}:\\`;
    if (fs.existsSync(drivePath)) drives.push({ name: drivePath, path: drivePath });
  }
  return drives;
}

// Lists subdirectories of `dir` so the frontend can render a click-through
// folder browser for picking playlist/root folders on this same machine.
router.get('/', (req, res) => {
  const dir = req.query.dir;

  if (!dir) {
    if (process.platform === 'win32') {
      return res.json({ dir: null, parent: null, entries: listWindowsDrives() });
    }
    return res.json({ dir: null, parent: null, entries: [{ name: '/', path: '/' }] });
  }

  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => ({ name: e.name, path: path.join(dir, e.name) }))
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
  } catch (err) {
    return res.status(400).json({ error: `Cannot read directory: ${err.message}` });
  }

  const parent = path.dirname(dir);
  res.json({ dir, parent: parent !== dir ? parent : null, entries });
});

module.exports = router;
