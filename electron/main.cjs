const { app, BrowserWindow, ipcMain, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Create a simple MIDI icon using nativeImage
function createMidiIcon() {
  // Simple 32x32 PNG with MIDI note icon (blue)
  const iconDataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAA7AAAAOwBeShxvQAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAGRSURBVFiF7ZY/SwMxGMZ/SXtHe3cg4qQOgouDk6ODo4uLi4NfwM3FwcnJQQc/gKOT4ODi4OAHcHJycHBwcHBwcFBHF6UX7TnkklxyaautQ+EDIcm95MnL+5JLjKqSM5zLK8A5A/wS4EPHAFVtA0qqGvYFoKqXIrIHmEAzAbwH7gI3YoCxVwFngQHAtQD9BJC5Bz4HiIE6kAJVYA44AV4Br8DJYYyqLsTuqwi4E5EWcABYT4C3J4FJ4BdBY+wPYA1oBGjNALwXgXHgAXgJvBKRW+AYOAdaga4BKgELwGsRuTYFvgYuAwsi0vIADYFaRGZE5D1wJSJnwHMT4HoAWAlANdMB2oEB+SYiM8BzU8CrAWYyAO4C+8B94FlEHoEbYCIC+C5gMQBnqnoO3APz2NnwGbiGDa5eBNZF5AEYAl4B54A5EbkBLgA3IhIHmASuReSzqu4H/wD/C7gxDGOr1Wr9EpGuK5sJJgaYzQBYi0Bdu93ezwDZi8C7CHwIbAJ7xpibFxeXO1ar9dIYM28Sn/4FfANS2HJhqTuKPgAAAABJRU5ErkJggg==';
  return nativeImage.createFromDataURL(iconDataUrl);
}

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs'),
    },
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#0f172a',
  });

  // In development, load from Vite dev server
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    // In production, load the built files
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// Handle MIDI file creation for drag & drop
ipcMain.handle('create-midi-file', async (event, { data, filename }) => {
  try {
    // Create temp file for drag operation
    const tempDir = os.tmpdir();
    const filePath = path.join(tempDir, filename);

    // Convert base64 to buffer and write
    const buffer = Buffer.from(data, 'base64');
    fs.writeFileSync(filePath, buffer);

    return filePath;
  } catch (error) {
    console.error('Error creating MIDI file:', error);
    throw error;
  }
});

// Handle native file drag start
ipcMain.on('ondragstart', (event, filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      event.sender.startDrag({
        file: filePath,
        icon: createMidiIcon(),
      });
    }
  } catch (error) {
    console.error('Error starting drag:', error);
  }
});

// Clean up temp files on quit
app.on('will-quit', () => {
  // Cleanup temp MIDI files if needed
});
