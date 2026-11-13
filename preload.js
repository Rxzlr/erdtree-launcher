const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('erd', {
  invoke: async (action, payload) => {
    const result = await ipcRenderer.invoke('erd', action, payload);
    if (!result || !result.ok) {
      const error = new Error((result && result.error) || 'فشل الاتصال بالتطبيق');
      if (result && result.code) error.code = result.code;
      if (result && result.url) error.url = result.url;
      throw error;
    }
    return result.data;
  },
  account: async (action, payload) => {
    const result = await ipcRenderer.invoke('account', action, payload || {});
    if (!result || !result.ok) throw new Error((result && result.error) || 'Account request failed');
    return result.data;
  },
  onAccount: (callback) => {
    const listener = (_event, session) => {
      try {
        callback(session);
      } catch {
        /* renderer handler error */
      }
    };
    ipcRenderer.on('account:changed', listener);
    return () => ipcRenderer.removeListener('account:changed', listener);
  },
  window: (action) => ipcRenderer.invoke('win', action),
  onEvent: (callback) => {
    const listener = (_event, payload) => {
      try {
        callback(payload);
      } catch {
        /* renderer handler error */
      }
    };
    ipcRenderer.on('launcher:event', listener);
    return () => ipcRenderer.removeListener('launcher:event', listener);
  },
  platform: process.platform,
});