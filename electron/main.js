const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const fs = require('fs/promises');
const path = require('path');
const https = require('https');
const isDev = !app.isPackaged;

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

// ─── Spotify helpers ──────────────────────────────────────────────────────────

const CREDENTIALS_FILE = path.join(app.getPath('userData'), 'spotify-credentials.json');

async function readCredentials() {
  try {
    const raw = await fs.readFile(CREDENTIALS_FILE, 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function httpsRequest(options, body) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function getSpotifyToken(clientId, clientSecret) {
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const body = 'grant_type=client_credentials';
  const result = await httpsRequest({
    hostname: 'accounts.spotify.com',
    path: '/api/token',
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(body),
    },
  }, body);
  if (result.status !== 200 || !result.body.access_token) {
    throw new Error('Spotify authenticatie mislukt. Controleer je Client ID en Secret.');
  }
  return result.body.access_token;
}

function extractPlaylistId(urlOrId) {
  try {
    const url = new URL(urlOrId);
    const parts = url.pathname.split('/');
    const idx = parts.indexOf('playlist');
    if (idx !== -1 && parts[idx + 1]) return parts[idx + 1].split('?')[0];
  } catch {
    // not a URL – treat as raw ID
  }
  return urlOrId.trim();
}

async function fetchAllPlaylistTracks(token, playlistId) {
  const tracks = [];
  let url = `/v1/playlists/${playlistId}/tracks?limit=100&fields=next,items(track(id,name,artists,duration_ms,album(name,images)))`;

  while (url) {
    const result = await httpsRequest({
      hostname: 'api.spotify.com',
      path: url,
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (result.status !== 200) throw new Error(`Spotify API fout: ${result.status}`);
    const data = result.body;
    for (const item of (data.items || [])) {
      if (!item.track || !item.track.id) continue;
      const t = item.track;
      tracks.push({
        id: t.id,
        title: t.name,
        artist: t.artists.map((a) => a.name).join(', '),
        album: t.album?.name || null,
        durationMs: t.duration_ms,
        coverUrl: t.album?.images?.[0]?.url || null,
      });
    }
    // next is a full URL like https://api.spotify.com/v1/…
    if (data.next) {
      url = new URL(data.next).pathname + new URL(data.next).search;
    } else {
      url = null;
    }
  }
  return tracks;
}

// ─── IPC: Spotify credentials ─────────────────────────────────────────────────

ipcMain.handle('spotify:saveCredentials', async (_, { clientId, clientSecret }) => {
  await fs.writeFile(CREDENTIALS_FILE, JSON.stringify({ clientId, clientSecret }), 'utf8');
  return true;
});

ipcMain.handle('spotify:loadCredentials', async () => {
  return await readCredentials();
});

// ─── IPC: Fetch playlist ───────────────────────────────────────────────────────

ipcMain.handle('spotify:fetchPlaylist', async (_, { playlistUrl }) => {
  const creds = await readCredentials();
  if (!creds?.clientId || !creds?.clientSecret) {
    throw new Error('Geen Spotify API-gegevens gevonden. Sla eerst je Client ID en Secret op.');
  }

  const token = await getSpotifyToken(creds.clientId, creds.clientSecret);

  // Fetch playlist metadata
  const playlistId = extractPlaylistId(playlistUrl);
  const metaResult = await httpsRequest({
    hostname: 'api.spotify.com',
    path: `/v1/playlists/${playlistId}?fields=name,description,images,owner(display_name)`,
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (metaResult.status !== 200) throw new Error(`Playlist ophalen mislukt: ${metaResult.status}`);
  const meta = metaResult.body;

  const tracks = await fetchAllPlaylistTracks(token, playlistId);

  return {
    id: playlistId,
    name: meta.name,
    description: meta.description || '',
    owner: meta.owner?.display_name || '',
    coverUrl: meta.images?.[0]?.url || null,
    tracks,
  };
});

// ─── IPC: Select download folder ──────────────────────────────────────────────

ipcMain.handle('dialog:selectFolder', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    properties: ['openDirectory', 'createDirectory'],
    title: 'Kies downloadmap',
  });
  return canceled ? null : filePaths[0];
});

// ─── IPC: Download track via yt-dlp ───────────────────────────────────────────

ipcMain.handle('spotify:downloadTrack', async (event, { track, outputDir }) => {
  const { default: YTDlpWrap } = await import('yt-dlp-wrap');
  const ytDlp = new YTDlpWrap();

  const query = `ytsearch1:${track.artist} ${track.title} audio`;
  // Sanitize filename: replace characters that are invalid on Windows, macOS, or Linux,
  // strip leading/trailing dots and spaces, and truncate to avoid PATH_MAX issues.
  const safeName = `${track.artist} - ${track.title}`
    .replace(/[/\\?%*:|"<>\x00-\x1f]/g, '_')
    .replace(/\.{2,}/g, '_')
    .replace(/^[. ]+|[. ]+$/g, '')
    .substring(0, 200) || 'track';
  const outputTemplate = path.join(outputDir, `${safeName}.%(ext)s`);

  return new Promise((resolve, reject) => {
    const args = [
      query,
      '--extract-audio',
      '--audio-format', 'mp3',
      '--audio-quality', '0',
      '--embed-metadata',
      '--no-playlist',
      '-o', outputTemplate,
      '--no-warnings',
      '--quiet',
    ];

    const proc = ytDlp.exec(args);

    proc.on('ytDlpEvent', (eventType, data) => {
      if (eventType === 'download' || eventType === 'ffmpeg') {
        event.sender.send('spotify:downloadProgress', { trackId: track.id, eventType, data });
      }
    });

    proc.on('error', (err) => {
      reject(new Error(`Download mislukt voor "${track.title}": ${err.message}`));
    });

    proc.on('close', () => {
      resolve({ trackId: track.id, success: true });
    });
  });
});
