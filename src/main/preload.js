// Preload script — exposes safe IPC bridge to admin renderer
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    getServerInfo: () => ipcRenderer.invoke('get-server-info'),
    generateQR: (url) => ipcRenderer.invoke('generate-qr', url),
    refreshIP: () => ipcRenderer.invoke('refresh-ip'),
    exportCSV: () => ipcRenderer.invoke('export-csv'),
    exportJSON: () => ipcRenderer.invoke('export-json'),
});
