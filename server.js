const express = require('express');
const path = require('path');

const browseRoutes = require('./src/routes/browse');
const playlistRoutes = require('./src/routes/playlists');
const videoRoutes = require('./src/routes/videos');
const progressRoutes = require('./src/routes/progress');
const searchRoutes = require('./src/routes/search');

const app = express();
const PORT = process.env.PORT || 4173;
const HOST = '127.0.0.1'; // local-only: this app streams arbitrary local files, never bind it beyond localhost

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/browse', browseRoutes);
app.use('/api/playlists', playlistRoutes);
app.use('/api/videos', videoRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/search', searchRoutes);

app.listen(PORT, HOST, () => {
  console.log(`ytube running at http://localhost:${PORT}`);
});
