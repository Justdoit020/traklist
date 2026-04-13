const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  openFile: () => ipcRenderer.invoke('dialog:openFile'),
  openMusicFolder: () => ipcRenderer.invoke('dialog:openMusicFolder'),
  scanLibrary: (folderPath) => ipcRenderer.invoke('library:scan', folderPath),
  fetchSpotifyPlaylist: (args) => ipcRenderer.invoke('spotify:fetchPlaylist', args),
  saveSpotifyCredentials: (creds) => ipcRenderer.invoke('settings:saveSpotifyCredentials', creds),
  loadSpotifyCredentials: () => ipcRenderer.invoke('settings:loadSpotifyCredentials'),
  platform: process.platform,
});
