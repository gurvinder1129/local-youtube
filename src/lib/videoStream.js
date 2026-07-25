const fs = require('fs');
const path = require('path');

const MIME_TYPES = {
  '.mp4': 'video/mp4',
  '.m4v': 'video/mp4',
  '.webm': 'video/webm',
  '.ogg': 'video/ogg',
  '.ogv': 'video/ogg',
  '.mkv': 'video/x-matroska',
  '.avi': 'video/x-msvideo',
  '.mov': 'video/quicktime',
  '.wmv': 'video/x-ms-wmv',
  '.flv': 'video/x-flv',
};

function mimeFor(filePath) {
  return MIME_TYPES[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
}

// Streams a local video file to the response, honoring HTTP Range requests so
// the browser's <video> element can seek without downloading the whole file.
function streamVideo(req, res, filePath) {
  let stat;
  try {
    stat = fs.statSync(filePath);
  } catch (err) {
    res.status(404).send('Video not found');
    return;
  }

  const fileSize = stat.size;
  const range = req.headers.range;
  const contentType = mimeFor(filePath);

  if (!range) {
    res.writeHead(200, {
      'Content-Length': fileSize,
      'Content-Type': contentType,
      'Accept-Ranges': 'bytes',
    });
    fs.createReadStream(filePath).pipe(res);
    return;
  }

  const match = /bytes=(\d*)-(\d*)/.exec(range);
  let start = match && match[1] ? parseInt(match[1], 10) : 0;
  let end = match && match[2] ? parseInt(match[2], 10) : fileSize - 1;

  if (Number.isNaN(start) || Number.isNaN(end) || start > end || end >= fileSize) {
    res.writeHead(416, { 'Content-Range': `bytes */${fileSize}` });
    res.end();
    return;
  }

  const chunkSize = end - start + 1;
  res.writeHead(206, {
    'Content-Range': `bytes ${start}-${end}/${fileSize}`,
    'Accept-Ranges': 'bytes',
    'Content-Length': chunkSize,
    'Content-Type': contentType,
  });
  fs.createReadStream(filePath, { start, end }).pipe(res);
}

module.exports = { streamVideo, mimeFor };
