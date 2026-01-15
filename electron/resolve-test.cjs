console.log('Testing require.resolve...');
try {
  const resolved = require.resolve('electron');
  console.log('require.resolve("electron"):', resolved);
} catch (e) {
  console.log('resolve error:', e.message);
}

// Try direct require of internal
console.log('\nTrying internal electron module...');
const Module = require('module');
console.log('Built-in modules:', Module.builtinModules.filter(m => m.includes('electron')));

// Check if electron is in built-in modules
console.log('\nHas electron in builtins:', Module.builtinModules.includes('electron'));
