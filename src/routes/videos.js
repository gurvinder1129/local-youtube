const express = require('express');
const fs = require('fs');
const { streamVideo } = require('../lib/videoStream');
const { getThumbnail } = require('../lib/thumbnails');

const router = express.Router();

router.get('/stream', (req, res) => {
  const filePath = req.query.path;
  if (!filePath || !fs.existsSync(filePath)) {
    return res.status(404).send('Video not found');
  }
  streamVideo(req, res, filePath);
});

router.get('/thumbnail', async (req, res) => {
  const filePath = req.query.path;
  if (!filePath || !fs.existsSync(filePath)) {
    return res.status(404).send('Video not found');
  }
  try {
    const stat = fs.statSync(filePath);
    const thumbPath = await getThumbnail(filePath, stat.mtimeMs);
    res.sendFile(thumbPath);
  } catch (err) {
    res.status(500).send('Thumbnail unavailable');
  }
});

module.exports = router;
