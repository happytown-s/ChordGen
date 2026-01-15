// This should only work in Electron's main process
if (typeof process !== 'undefined' && process.versions && process.versions.electron) {
  console.log('Running in Electron main process');
  console.log('Electron version:', process.versions.electron);
  const { app } = require('electron');
  console.log('app:', app);
  app.quit();
} else {
  console.log('Not running in Electron');
}
