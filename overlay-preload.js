const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('erdOverlay', {
  invoke: async (action, payload) => {
    const result = await ipcRenderer.invoke('erd', action, payload);
    if (!result || !result.ok) throw new Error((result && result.error) || 'Launcher IPC failed');
    return result.data;
  },
  on: (callback) => {
    const listener = (_event, payload) => {
      try {
        callback(payload);
      } catch {
        /* ignore */
      }
    };
    ipcRenderer.on('overlay:event', listener);
    return () => ipcRenderer.removeListener('overlay:event', listener);
  },
  resize: (height) => ipcRenderer.send('overlay:resize', height),
  hide: () => ipcRenderer.send('overlay:hide'),
  platform: process.platform,
});
