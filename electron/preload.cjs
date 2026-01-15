const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Create a MIDI file and return its path for native drag
  createMidiFile: (data, filename) => {
    return ipcRenderer.invoke('create-midi-file', { data, filename });
  },

  // Check if running in Electron
  isElectron: true,

  // Start native file drag
  startDrag: (filePath) => {
    ipcRenderer.send('ondragstart', filePath);
  },
});
