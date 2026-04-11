const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const fs = require('fs/promises');
const path = require('path');
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
