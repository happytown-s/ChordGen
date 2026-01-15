// Simple test
console.log('Test starting...');
console.log('process.type:', process.type);
console.log('process.versions:', process.versions);

// Check if we're in a browser/renderer context
if (typeof window !== 'undefined') {
  console.log('In renderer process (window exists)');
}

// Try require in different ways
try {
  const electron = require('electron');
  console.log('electron require result type:', typeof electron);
  if (typeof electron === 'string') {
    console.log('ERROR: electron returned a string path');
    // This happens when electron npm package is loaded in Node, not Electron main process
  } else if (typeof electron === 'object') {
    console.log('electron keys:', Object.keys(electron));
    console.log('Has app:', !!electron.app);
  }
} catch (e) {
  console.log('Error requiring electron:', e.message);
}

console.log('Test complete');
process.exit(0);
