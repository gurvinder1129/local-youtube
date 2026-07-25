const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFile } = require('child_process');
const ffmpegPath = require('ffmpeg-static');
const { DATA_DIR } = require('./db');

const THUMB_DIR = path.join(DATA_DIR, 'thumbnails');
const inflight = new Map();

function ensureThumbDir() {
  if (!fs.existsSync(THUMB_DIR)) fs.mkdirSync(THUMB_DIR, { recursive: true });
}

function thumbPathFor(videoPath, mtimeMs) {
  const hash = crypto.createHash('sha1').update(`${videoPath}:${mtimeMs}`).digest('hex');
  return path.join(THUMB_DIR, `${hash}.jpg`);
}

// Generates (or reuses a cached) thumbnail for a video, returning the local file path to the jpg.
function getThumbnail(videoPath, mtimeMs) {
  ensureThumbDir();
  const outPath = thumbPathFor(videoPath, mtimeMs);

  if (fs.existsSync(outPath)) return Promise.resolve(outPath);
  if (inflight.has(outPath)) return inflight.get(outPath);

  const promise = new Promise((resolve, reject) => {
    execFile(
      ffmpegPath,
      ['-y', '-ss', '1', '-i', videoPath, '-frames:v', '1', '-vf', 'scale=320:-2', outPath],
      { timeout: 20000 },
      (err) => {
        inflight.delete(outPath);
        if (err || !fs.existsSync(outPath)) {
          reject(err || new Error('thumbnail generation produced no output'));
          return;
        }
        resolve(outPath);
      }
    );
  });

  inflight.set(outPath, promise);
  return promise;
}

module.exports = { getThumbnail };
