export interface ElectronAPI {
  createMidiFile: (data: string, filename: string) => Promise<string>;
  isElectron: boolean;
  startDrag: (filePath: string) => void;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
