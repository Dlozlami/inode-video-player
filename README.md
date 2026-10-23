# inode Media Player

A local media player built with Electron + React. Plays video and images from a folder on your machine. Files are identified by inode, so renames don't break your tags or play history.

## Features

- Plays video (mp4, mkv, avi, mov, webm, flv, wmv, m4v), GIFs, and images (jpg, png, webp, gif, bmp, tiff, avif)
- Tag files and filter your library by tag
- Filter by duration, tag count, and play count
- Media type toggle: All / Video / Images (GIF counts as video)
- Shuffle and loop
- Play count tracking
- Session tracking
- Bulk delete by tag
- Export library metadata as JSON
- Delete files from within the player (two-click confirm)
- Resumes last played file on relaunch

## Stack

- Electron
- React + Vite
- React Router (hash-based)
- CSS Modules

## Requirements

- Node.js 18+

## Install

```bash
npm install
```

## Run

```bash
npm run dev
```

## Build

```bash
npm run build
```

## Notes

- Tags and play history are stored in a `tags.json` file inside your media folder.
- Tag vocabulary and session logs are stored in Electron's userData directory.
- No media files are ever uploaded or transmitted anywhere.