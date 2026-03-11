const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  // Add any specific electron APIs here if needed
  platform: process.platform,
  openExternal: (url) => ipcRenderer.invoke('open-external', url)
});
