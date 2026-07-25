const fs = require('fs');
const path = require('path');
const { naturalCompare } = require('./naturalSort');

const VIDEO_EXTENSIONS = new Set([
  '.mp4', '.webm', '.ogg', '.ogv', '.m4v',
  '.mkv', '.avi', '.mov', '.wmv', '.flv',
]);

function isVideoFile(filename) {
  return VIDEO_EXTENSIONS.has(path.extname(filename).toLowerCase());
}

function safeReaddir(dirPath) {
  try {
    return fs.readdirSync(dirPath, { withFileTypes: true });
  } catch (err) {
    return [];
  }
}

// Immediate subdirectories of a folder (used to expand a "root" into playlists).
function listSubfolders(dirPath) {
  return safeReaddir(dirPath)
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(dirPath, entry.name))
    .sort((a, b) => naturalCompare(path.basename(a), path.basename(b)));
}

// Video files directly inside a playlist folder (non-recursive), with fs stat metadata.
function listVideos(dirPath) {
  return safeReaddir(dirPath)
    .filter((entry) => entry.isFile() && isVideoFile(entry.name))
    .map((entry) => {
      const filePath = path.join(dirPath, entry.name);
      let stat;
      try {
        stat = fs.statSync(filePath);
      } catch (err) {
        return null;
      }
      return {
        path: filePath,
        name: entry.name,
        title: path.basename(entry.name, path.extname(entry.name)),
        ext: path.extname(entry.name).toLowerCase(),
        size: stat.size,
        mtimeMs: stat.mtimeMs,
      };
    })
    .filter(Boolean);
}

function sortVideos(videos, sortKey) {
  const sorted = [...videos];
  switch (sortKey) {
    case 'name-desc':
      sorted.sort((a, b) => naturalCompare(b.name, a.name));
      break;
    case 'date-asc':
      sorted.sort((a, b) => a.mtimeMs - b.mtimeMs);
      break;
    case 'date-desc':
      sorted.sort((a, b) => b.mtimeMs - a.mtimeMs);
      break;
    case 'name-asc':
    default:
      sorted.sort((a, b) => naturalCompare(a.name, b.name));
      break;
  }
  return sorted;
}

function folderExists(dirPath) {
  try {
    return fs.statSync(dirPath).isDirectory();
  } catch (err) {
    return false;
  }
}

module.exports = {
  VIDEO_EXTENSIONS,
  isVideoFile,
  listSubfolders,
  listVideos,
  sortVideos,
  folderExists,
};
