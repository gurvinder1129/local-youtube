const jsonHeaders = { 'Content-Type': 'application/json' };

const state = {
  view: 'home',
  roots: [],
  playlists: [],
  currentPlaylist: null,
  videos: [],
  sort: 'name-asc',
  currentIndex: -1,
};

let browseState = { mode: null, dir: null };
let lastSaveTime = 0;
let searchDebounce = null;

function qs(sel, root = document) { return root.querySelector(sel); }

async function api(url, opts) {
  const res = await fetch(url, opts);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Request failed');
  }
  return res.json();
}

function encPath(p) { return encodeURIComponent(p); }

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

function formatDate(ms) {
  return ms ? new Date(ms).toLocaleDateString() : '';
}

function formatDuration(seconds) {
  seconds = Math.max(0, Math.round(seconds || 0));
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const mm = h ? String(m).padStart(2, '0') : String(m);
  const ss = String(s).padStart(2, '0');
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

// ---------- Home view ----------

async function loadHome() {
  state.view = 'home';
  state.currentPlaylist = null;
  const data = await api('/api/playlists');
  state.roots = data.roots;
  state.playlists = data.playlists;
  renderHome();
}

function renderHome() {
  const main = qs('#main');

  const rootsHtml = state.roots.length ? `
    <div class="roots-bar">
      ${state.roots.map((r) => `
        <span class="root-chip">📁 ${escapeHtml(r)}
          <button data-remove-root="${escapeHtml(r)}" title="Remove root folder">&times;</button>
        </span>`).join('')}
    </div>` : '';

  if (!state.playlists.length) {
    main.innerHTML = `${rootsHtml}<div class="empty-state">
      <h2>No playlists yet</h2>
      <p>Add a root folder (each of its subfolders becomes a playlist) or add a single playlist folder using the buttons above.</p>
    </div>`;
  } else {
    main.innerHTML = `${rootsHtml}<div class="playlist-grid">${state.playlists.map((p, i) => `
      <div class="playlist-card" data-index="${i}">
        ${p.source === 'manual' ? `<button class="remove-btn" data-remove="${i}" title="Remove playlist">&times;</button>` : ''}
        <div class="playlist-thumb" ${p.firstVideoPath ? `style="background-image:url('/api/videos/thumbnail?path=${encPath(p.firstVideoPath)}')"` : ''}>${p.firstVideoPath ? '' : '🎬'}</div>
        <div class="playlist-info">
          <div class="name">${escapeHtml(p.name)}</div>
          <div class="meta">${p.videoCount} video${p.videoCount === 1 ? '' : 's'} · ${p.percentComplete}% complete</div>
          <div class="progress-bar"><div style="width:${p.percentComplete}%"></div></div>
        </div>
      </div>`).join('')}</div>`;
  }

  main.querySelectorAll('.playlist-card').forEach((card) => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('.remove-btn')) return;
      openPlaylist(state.playlists[Number(card.dataset.index)]);
    });
  });
  main.querySelectorAll('[data-remove]').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const p = state.playlists[Number(btn.dataset.remove)];
      if (!confirm(`Remove "${p.name}" from your playlists?\n(Files on disk are not deleted.)`)) return;
      await api(`/api/playlists?path=${encPath(p.path)}&type=manual`, { method: 'DELETE' });
      loadHome();
    });
  });
  main.querySelectorAll('[data-remove-root]').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const r = btn.dataset.removeRoot;
      if (!confirm(`Remove root folder "${r}"?\nAll playlists discovered from it will disappear from ytube (files stay on disk).`)) return;
      await api(`/api/playlists?path=${encPath(r)}&type=root`, { method: 'DELETE' });
      loadHome();
    });
  });
}

// ---------- Playlist / player view ----------

async function openPlaylist(playlist, opts = {}) {
  state.view = 'playlist';
  state.currentPlaylist = playlist;
  const sort = state.sort || 'name-asc';
  const data = await api(`/api/playlists/videos?path=${encPath(playlist.path)}&sort=${sort}`);
  state.videos = data.videos;
  state.sort = data.sort;
  renderPlaylistView();

  if (!state.videos.length) return;

  let idx = 0;
  if (opts.videoPath) {
    idx = state.videos.findIndex((v) => v.path === opts.videoPath);
    if (idx < 0) idx = 0;
  } else {
    const firstUnwatched = state.videos.findIndex((v) => !v.progress.completed);
    idx = firstUnwatched >= 0 ? firstUnwatched : 0;
  }
  selectVideo(idx, { resume: true });
}

function renderPlaylistView() {
  const main = qs('#main');
  main.innerHTML = `
    <div class="player-view">
      <div class="player-main">
        <div class="player-header">
          <button class="back-btn" id="backBtn">&larr; All Playlists</button>
          <div class="playlist-title">${escapeHtml(state.currentPlaylist.name)}</div>
        </div>
        <video id="player" controls></video>
        <div class="video-title-row">
          <div class="now-title" id="nowTitle"></div>
          <button class="btn small" id="toggleWatchedBtn">Mark watched</button>
        </div>
      </div>
      <div class="playlist-panel">
        <div class="panel-header">
          <strong>${state.videos.length} video${state.videos.length === 1 ? '' : 's'}</strong>
          <select id="sortSelect">
            <option value="name-asc">Name (A &rarr; Z)</option>
            <option value="name-desc">Name (Z &rarr; A)</option>
            <option value="date-desc">Date modified (newest first)</option>
            <option value="date-asc">Date modified (oldest first)</option>
          </select>
        </div>
        <div class="video-list" id="videoList"></div>
      </div>
    </div>`;

  qs('#sortSelect').value = state.sort;
  qs('#backBtn').addEventListener('click', loadHome);
  qs('#sortSelect').addEventListener('change', (e) => changeSort(e.target.value));
  qs('#toggleWatchedBtn').addEventListener('click', toggleWatchedCurrent);

  renderVideoList();
  setupPlayerEvents();
}

async function changeSort(newSort) {
  const currentPath = state.currentIndex >= 0 ? state.videos[state.currentIndex].path : null;
  const data = await api(`/api/playlists/videos?path=${encPath(state.currentPlaylist.path)}&sort=${newSort}`);
  state.videos = data.videos;
  state.sort = data.sort;
  state.currentIndex = currentPath ? state.videos.findIndex((v) => v.path === currentPath) : -1;
  renderVideoList();
}

function renderVideoList() {
  const list = qs('#videoList');
  list.innerHTML = state.videos.map((v, i) => {
    const pct = v.progress.duration ? Math.min(100, Math.round((v.progress.position / v.progress.duration) * 100)) : 0;
    const subBits = [formatDate(v.mtimeMs)];
    if (v.progress.duration) subBits.push(formatDuration(v.progress.duration));
    return `
    <div class="video-row ${i === state.currentIndex ? 'active' : ''}" data-index="${i}">
      <div class="idx">${i + 1}</div>
      <div class="check ${v.progress.completed ? 'done' : ''}" data-check="${i}" title="Toggle watched">${v.progress.completed ? '&#10003;' : ''}</div>
      <div class="thumb" data-play="${i}" style="background-image:url('/api/videos/thumbnail?path=${encPath(v.path)}')"></div>
      <div class="info" data-play="${i}">
        <div class="title">${escapeHtml(v.title)}</div>
        <div class="sub">${subBits.join(' · ')}</div>
        ${pct > 0 && !v.progress.completed ? `<div class="mini-progress"><div style="width:${pct}%"></div></div>` : ''}
      </div>
    </div>`;
  }).join('');

  list.querySelectorAll('[data-play]').forEach((el) => {
    el.addEventListener('click', () => selectVideo(Number(el.dataset.play), { resume: true }));
  });
  list.querySelectorAll('[data-check]').forEach((el) => {
    el.addEventListener('click', async (e) => {
      e.stopPropagation();
      const idx = Number(el.dataset.check);
      const v = state.videos[idx];
      const res = await api('/api/progress/toggle', { method: 'POST', headers: jsonHeaders, body: JSON.stringify({ videoPath: v.path }) });
      v.progress = res.progress;
      if (idx === state.currentIndex) updateWatchedBtn();
      renderVideoList();
    });
  });

  const active = list.querySelector('.video-row.active');
  if (active) active.scrollIntoView({ block: 'nearest' });
}

function selectVideo(index, { resume = false } = {}) {
  state.currentIndex = index;
  const v = state.videos[index];
  const player = qs('#player');
  player.src = `/api/videos/stream?path=${encPath(v.path)}`;
  qs('#nowTitle').textContent = v.title;
  updateWatchedBtn();

  player.onloadedmetadata = () => {
    if (resume && v.progress.position > 0 && !v.progress.completed) {
      player.currentTime = Math.min(v.progress.position, Math.max(0, player.duration - 1));
    }
    if (!v.progress.duration && player.duration) {
      v.progress.duration = player.duration;
    }
  };
  player.play().catch(() => {});
  renderVideoList();
}

function updateWatchedBtn() {
  if (state.currentIndex < 0) return;
  const v = state.videos[state.currentIndex];
  qs('#toggleWatchedBtn').textContent = v.progress.completed ? 'Mark unwatched' : 'Mark watched';
}

async function toggleWatchedCurrent() {
  if (state.currentIndex < 0) return;
  const v = state.videos[state.currentIndex];
  const res = await api('/api/progress/toggle', { method: 'POST', headers: jsonHeaders, body: JSON.stringify({ videoPath: v.path }) });
  v.progress = res.progress;
  updateWatchedBtn();
  renderVideoList();
}

function setupPlayerEvents() {
  const player = qs('#player');
  player.addEventListener('timeupdate', () => {
    const now = Date.now();
    if (now - lastSaveTime < 5000) return;
    lastSaveTime = now;
    saveProgress();
  });
  player.addEventListener('pause', () => saveProgress());
  player.addEventListener('ended', async () => {
    await saveProgress(true);
    const next = state.currentIndex + 1;
    if (next < state.videos.length) selectVideo(next, { resume: true });
  });
}

async function saveProgress(forceComplete = false) {
  if (state.currentIndex < 0) return;
  const player = qs('#player');
  if (!player.duration) return;
  const v = state.videos[state.currentIndex];
  const position = forceComplete ? player.duration : player.currentTime;
  const res = await api('/api/progress', {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify({ videoPath: v.path, position, duration: player.duration }),
  });
  v.progress = res.progress;
  updateWatchedBtn();
  renderVideoList();
}

// ---------- Search ----------

function hideSearchResults() { qs('#searchResults').classList.add('hidden'); }

async function runSearch(q) {
  const data = await api(`/api/search?q=${encodeURIComponent(q)}`);
  renderSearchResults(data.results, q);
}

function renderSearchResults(results, q) {
  const box = qs('#searchResults');
  if (!results.length) {
    box.innerHTML = `<div class="search-empty">No matches for "${escapeHtml(q)}"</div>`;
  } else {
    box.innerHTML = results.map((group) => `
      <div class="search-group">
        <div class="search-group-title">${escapeHtml(group.playlistName)}</div>
        ${group.videos.slice(0, 8).map((v) => `
          <div class="search-item" data-playlist="${escapeHtml(group.playlistPath)}" data-playlist-name="${escapeHtml(group.playlistName)}" data-video="${escapeHtml(v.path)}">
            🎬 ${escapeHtml(v.title)}
          </div>`).join('')}
      </div>`).join('');
  }
  box.classList.remove('hidden');

  box.querySelectorAll('.search-item').forEach((el) => {
    el.addEventListener('click', async () => {
      const playlistPath = el.dataset.playlist;
      const videoPath = el.dataset.video;
      const playlistName = el.dataset.playlistName;
      hideSearchResults();
      qs('#searchInput').value = '';
      const playlist = state.playlists.find((p) => p.path === playlistPath) || { path: playlistPath, name: playlistName };
      await openPlaylist(playlist, { videoPath });
    });
  });
}

// ---------- Folder browse modal ----------

function openBrowseModal(mode) {
  browseState = { mode, dir: null };
  qs('#browseModalTitle').textContent = mode === 'root'
    ? 'Select Root Folder (its subfolders become playlists)'
    : 'Select Playlist Folder';
  qs('#browseModal').classList.remove('hidden');
  loadBrowseDir(null);
}

async function loadBrowseDir(dir) {
  const url = dir ? `/api/browse?dir=${encPath(dir)}` : '/api/browse';
  const data = await api(url);
  browseState.dir = data.dir;
  qs('#browsePath').textContent = data.dir || 'This PC — choose a drive';

  const list = qs('#browseList');
  const rows = [];
  if (data.parent) {
    rows.push(`<div class="browse-item" data-nav="${escapeHtml(data.parent)}">&#8593; .. (up)</div>`);
  }
  rows.push(...data.entries.map((en) => `<div class="browse-item" data-nav="${escapeHtml(en.path)}">&#128193; ${escapeHtml(en.name)}</div>`));
  list.innerHTML = rows.length ? rows.join('') : '<div class="browse-item">No subfolders</div>';

  list.querySelectorAll('[data-nav]').forEach((el) => {
    el.addEventListener('click', () => loadBrowseDir(el.dataset.nav));
  });
  qs('#browseHint').textContent = data.dir ? '' : 'Pick a drive to start browsing.';
  qs('#browseUseBtn').disabled = !data.dir;
}

// ---------- Wiring ----------

document.addEventListener('DOMContentLoaded', () => {
  qs('#brandHome').addEventListener('click', loadHome);
  qs('#addRootBtn').addEventListener('click', () => openBrowseModal('root'));
  qs('#addPlaylistBtn').addEventListener('click', () => openBrowseModal('single'));
  qs('#browseModalClose').addEventListener('click', () => qs('#browseModal').classList.add('hidden'));
  qs('#browseUseBtn').addEventListener('click', async () => {
    if (!browseState.dir) return;
    const endpoint = browseState.mode === 'root' ? '/api/playlists/root' : '/api/playlists/single';
    await api(endpoint, { method: 'POST', headers: jsonHeaders, body: JSON.stringify({ path: browseState.dir }) });
    qs('#browseModal').classList.add('hidden');
    loadHome();
  });

  qs('#searchInput').addEventListener('input', (e) => {
    clearTimeout(searchDebounce);
    const q = e.target.value.trim();
    if (!q) { hideSearchResults(); return; }
    searchDebounce = setTimeout(() => runSearch(q), 250);
  });
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-wrap')) hideSearchResults();
  });

  loadHome();
});
