const electron = require('electron');
console.log('electron type:', typeof electron);
console.log('electron:', electron);
console.log('electron.app:', electron.app);

// Try default export
const electronDefault = require('electron').default;
console.log('electronDefault:', electronDefault);

// Check process
console.log('process.type:', process.type);
