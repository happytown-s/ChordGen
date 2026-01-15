console.log('Minimal test');
console.log('argv:', process.argv);
console.log('type:', process.type);

const electron = require('electron');
console.log('electron type:', typeof electron);

if (typeof electron === 'object' && electron.app) {
  console.log('SUCCESS: Got Electron APIs');
  electron.app.quit();
} else if (typeof electron === 'string') {
  console.log('FAIL: Got path string:', electron);
  process.exit(1);
}
