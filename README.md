# ytube — local video playlist player

A small local web app for watching video playlists you've already downloaded
onto your laptop, folder by folder — Udemy/YouTube-playlist style, but
entirely local. Nothing is uploaded or copied; the app streams your existing
files straight off disk.

## Features

- **Root folders** — pick one parent folder and every subfolder inside it is
  automatically treated as a playlist (e.g. a folder of downloaded courses,
  each course in its own subfolder).
- **Individual playlist folders** — add single folders one at a time instead.
- **Sorting** — per playlist, sort videos by name (natural/numeric order, so
  `2 -`, `10 -` sort correctly) ascending or descending, or by last-modified
  date, oldest or newest first.
- **Playback** — click a video to stream and play it, with seeking (HTTP
  range requests) so scrubbing doesn't re-download the file.
- **Progress tracking** — remembers playback position per video and resumes
  where you left off; marks a video "watched" automatically near the end, or
  toggle it manually. Each playlist card shows a completion percentage.
- **Thumbnails** — auto-generated (via ffmpeg) from a frame a second into
  each video, cached locally.
- **Search** — search box across all playlists and video filenames.

## Requirements

- Node.js 18+ (tested on Node 20).
- Windows, macOS, or Linux. No separate ffmpeg install needed — a static
  ffmpeg binary is installed automatically via the `ffmpeg-static` npm
  package for thumbnail generation.

## Setup

```bash
npm install
npm start
```

Then open **http://localhost:4173** in your browser.

The server binds to `127.0.0.1` only (not your network), since it streams
whatever local files you add.

## Usage

1. Click **+ Root Folder** and browse to a parent folder whose subfolders
   are each a course/playlist, or click **+ Playlist Folder** to add a
   single folder of videos directly. The folder browser lets you navigate
   your local drives since the app runs on the same machine.
2. Click a playlist card to open it. Playback starts on the first unwatched
   video automatically.
3. Use the sort dropdown in the playlist panel to reorder by name or date
   modified.
4. Click the checkmark next to a video to toggle watched/unwatched manually.
5. Use the search bar at the top to jump straight to a video across all your
   playlists.

## Notes & limitations

- Videos are read directly from the folder you point at (not recursively
  into subfolders) — put video files directly inside each playlist folder.
- Supported extensions: `.mp4 .webm .ogg .ogv .m4v .mkv .avi .mov .wmv .flv`.
  Browser playback support varies by codec — `.mp4` (H.264/AAC) and `.webm`
  are the safest bet; some `.mkv`/`.avi` files may not play in all browsers
  since there's no transcoding step.
- App data (which folders you've added, watch progress, cached thumbnails)
  is stored locally in `data/` next to the app — delete that folder to reset
  everything.

## Project layout

```
server.js              Express app entry point
src/lib/                Core logic: db storage, folder scanning, natural
                        sort, ffmpeg thumbnails, range-request video streaming
src/routes/             API routes (browse, playlists, videos, progress, search)
public/                 Frontend: index.html, styles.css, app.js (no build step)
```
