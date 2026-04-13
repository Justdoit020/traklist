const { app, BrowserWindow, ipcMain, dialog, safeStorage } = require('electron');
const fs = require('fs/promises');
const path = require('path');
const isDev = !app.isPackaged;

// ── Spotify helpers ────────────────────────────────────────────────────────────

const SPOTIFY_TRACKS_PAGE_SIZE = 100;

function extractSpotifyPlaylistId(url) {
  const match = url.match(/spotify\.com\/playlist\/([a-zA-Z0-9]+)/);
  return match ? match[1] : null;
}

async function spotifyGetToken(clientId, clientSecret) {
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error_description || `Spotify authenticatie mislukt (${res.status})`);
  }
  const data = await res.json();
  return data.access_token;
}

async function spotifyFetchAllTrackItems(playlistId, token) {
  const items = [];
  let url =
    `https://api.spotify.com/v1/playlists/${playlistId}/tracks` +
    `?limit=${SPOTIFY_TRACKS_PAGE_SIZE}&fields=next,items(track(id,name,artists(name),album(name),duration_ms))`;

  while (url) {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `Kan playlist tracks niet ophalen (${res.status})`);
    }
    const data = await res.json();
    items.push(...(data.items || []));
    url = data.next || null;
  }
  return items;
}

const AUDIO_EXTENSIONS = new Set(['.mp3', '.wav', '.aac', '.flac', '.m4a', '.ogg', '.aiff', '.alac']);

async function walkAudioFiles(rootDir) {
  const entries = await fs.readdir(rootDir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(rootDir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await walkAudioFiles(fullPath));
      continue;
    }
    if (!entry.isFile()) continue;

    const ext = path.extname(entry.name).toLowerCase();
    if (AUDIO_EXTENSIONS.has(ext)) files.push(fullPath);
  }

  return files;
}

function parseNumberTag(value) {
  if (value === null || value === undefined || value === '') return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

async function parseAudioMetadata(filePath) {
  // music-metadata is ESM-only in newer versions, so load it dynamically in CommonJS.
  const { parseFile } = await import('music-metadata');
  const metadata = await parseFile(filePath, { duration: true, skipCovers: true });
  const common = metadata.common || {};
  const format = metadata.format || {};
  const genre = Array.isArray(common.genre) ? common.genre[0] : common.genre;
  const bpm = parseNumberTag(common.bpm);

  return {
    filePath,
    fileName: path.basename(filePath),
    artist: common.artist || 'Onbekende artiest',
    title: common.title || path.basename(filePath, path.extname(filePath)),
    album: common.album || null,
    genre: genre || null,
    bpm: bpm ? Math.round(bpm) : null,
    key: common.key || null,
    year: common.year || null,
    durationSec: format.duration ? Math.round(format.duration) : null,
  };
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1100,
    height: 750,
    minWidth: 800,
    minHeight: 600,
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#0f0f13',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
    icon: path.join(__dirname, '../public/icon.png'),
  });

  if (isDev) {
    win.loadURL('http://localhost:3000');
  } else {
    win.loadFile(path.join(__dirname, '../build/index.html'));
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// Handle file open dialog
ipcMain.handle('dialog:openFile', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    filters: [
      { name: 'Audio', extensions: ['mp3', 'wav', 'aac', 'flac', 'm4a', 'ogg'] },
    ],
    properties: ['openFile'],
  });
  if (canceled) return null;
  return filePaths[0];
});

ipcMain.handle('dialog:openMusicFolder', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    properties: ['openDirectory'],
  });
  if (canceled) return null;
  return filePaths[0];
});

// ── Spotify credentials (encrypted via safeStorage) ──────────────────────────

function getCredsPath() {
  return path.join(app.getPath('userData'), 'spotify-creds.json');
}

ipcMain.handle('settings:saveSpotifyCredentials', async (_, { clientId, clientSecret }) => {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error('Veilige opslag niet beschikbaar op dit systeem.');
  }
  const data = {
    clientId: safeStorage.encryptString(clientId).toString('base64'),
    clientSecret: safeStorage.encryptString(clientSecret).toString('base64'),
  };
  // Write atomically (tmp → rename) with restrictive permissions to protect credentials
  const credsPath = getCredsPath();
  const tmpPath = `${credsPath}.tmp`;
  await fs.writeFile(tmpPath, JSON.stringify(data), { encoding: 'utf8', mode: 0o600 });
  await fs.rename(tmpPath, credsPath);
});

ipcMain.handle('settings:loadSpotifyCredentials', async () => {
  try {
    if (!safeStorage.isEncryptionAvailable()) return { clientId: '', clientSecret: '' };
    const raw = await fs.readFile(getCredsPath(), 'utf8');
    const data = JSON.parse(raw);
    return {
      clientId: safeStorage.decryptString(Buffer.from(data.clientId, 'base64')),
      clientSecret: safeStorage.decryptString(Buffer.from(data.clientSecret, 'base64')),
    };
  } catch {
    return { clientId: '', clientSecret: '' };
  }
});

// ── Spotify IPC ───────────────────────────────────────────────────────────────

ipcMain.handle('spotify:fetchPlaylist', async (_, { playlistUrl, clientId, clientSecret }) => {
  const playlistId = extractSpotifyPlaylistId(playlistUrl);
  if (!playlistId) throw new Error('Geen geldige Spotify playlist URL.');

  const token = await spotifyGetToken(clientId.trim(), clientSecret.trim());

  // Fetch playlist metadata (name)
  const metaRes = await fetch(
    `https://api.spotify.com/v1/playlists/${playlistId}?fields=name`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!metaRes.ok) {
    const err = await metaRes.json().catch(() => ({}));
    throw new Error(err.error?.message || `Kan playlist niet ophalen (${metaRes.status})`);
  }
  const meta = await metaRes.json();
  const playlistName = meta.name || 'Spotify Playlist';

  // Fetch all tracks
  const rawItems = await spotifyFetchAllTrackItems(playlistId, token);

  let currentSec = 0;
  const tracks = rawItems
    .filter((item) => item && item.track && (item.track.name || item.track.duration_ms))
    .map((item, i) => {
      const t = item.track;
      const durationSec = Math.round((t.duration_ms || 0) / 1000);
      const start = currentSec;
      currentSec += durationSec;
      return {
        id: i + 1,
        artist: (t.artists || []).map((a) => a.name).join(', ') || 'Onbekende artiest',
        title: t.name || `Track ${i + 1}`,
        label: t.album?.name || null,
        bpm: null,
        startSec: start,
        endSec: currentSec,
        confidence: 1.0,
      };
    });

  return { playlistName, tracks };
});

ipcMain.handle('library:scan', async (_, folderPath) => {
  if (!folderPath) {
    return { folderPath: null, totalFiles: 0, tracks: [], errors: ['Geen map geselecteerd.'] };
  }

  const files = await walkAudioFiles(folderPath);
  const tracks = [];
  const errors = [];

  for (const file of files) {
    try {
      tracks.push(await parseAudioMetadata(file));
    } catch {
      errors.push(`Kon metadata niet lezen: ${path.basename(file)}`);
    }
  }

  return {
    folderPath,
    totalFiles: files.length,
    tracks,
    errors,
  };
});
