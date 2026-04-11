const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  openFile: () => ipcRenderer.invoke('dialog:openFile'),
  openMusicFolder: () => ipcRenderer.invoke('dialog:openMusicFolder'),
  scanLibrary: (folderPath) => ipcRenderer.invoke('library:scan', folderPath),
  platform: process.platform,
});
