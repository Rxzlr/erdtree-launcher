// Read-only smoke test for the in-launcher Nexus window: opens the real
// catalogue page in the persistent partition, prints what loaded, then closes.
// It never signs in, never clicks and never downloads anything.
const { app, BrowserWindow } = require('electron');
const { createNexusSession } = require('../src/main/nexus-window');

app.whenReady().then(() => {
  const session = createNexusSession({
    getWindow: () => null,
    emit: (event) => console.log('[event]', JSON.stringify(event)),
  });
  const entry = {
    id: '3419',
    name: 'The Convergence',
    url: 'https://www.nexusmods.com/eldenring/mods/3419',
  };
  session
    .open(entry, { onProgress: (received, total) => console.log('[progress]', received, total) })
    .then((got) => console.log('[captured]', got.name))
    .catch((err) => console.log('[settled]', err.code || '', err.message));

  setTimeout(() => {
    for (const w of BrowserWindow.getAllWindows()) {
      console.log('[window]', JSON.stringify({ title: w.getTitle(), url: w.webContents.getURL() }));
    }
    session.close();
    setTimeout(() => app.quit(), 1500);
  }, 15000);
});