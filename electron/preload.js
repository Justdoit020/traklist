const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  openFile: () => ipcRenderer.invoke('dialog:openFile'),
  openMusicFolder: () => ipcRenderer.invoke('dialog:openMusicFolder'),
  scanLibrary: (folderPath) => ipcRenderer.invoke('library:scan', folderPath),
  selectFolder: () => ipcRenderer.invoke('dialog:selectFolder'),
  platform: process.platform,

  // Spotify
  saveSpotifyCredentials: (creds) => ipcRenderer.invoke('spotify:saveCredentials', creds),
  loadSpotifyCredentials: () => ipcRenderer.invoke('spotify:loadCredentials'),
  fetchSpotifyPlaylist: (opts) => ipcRenderer.invoke('spotify:fetchPlaylist', opts),
  downloadSpotifyTrack: (opts) => ipcRenderer.invoke('spotify:downloadTrack', opts),
  onDownloadProgress: (cb) => {
    const handler = (_event, data) => cb(data);
    ipcRenderer.on('spotify:downloadProgress', handler);
    return () => ipcRenderer.removeListener('spotify:downloadProgress', handler);
  },
});
