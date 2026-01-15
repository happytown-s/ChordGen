import MidiWriter from 'midi-writer-js';
import type { Chord, ChordProgression } from '../types';

const { Track, NoteEvent, Writer } = MidiWriter;

// Convert chord to MIDI track
function chordToTrack(chord: Chord, tempo: number) {
  const track = new Track();
  track.setTempo(tempo);

  // Add all notes of the chord simultaneously
  const noteEvent = new NoteEvent({
    pitch: chord.notes,
    duration: `${chord.durationBeats}`,
    velocity: 80,
  });
  track.addEvent(noteEvent);

  return track;
}

// Convert chord progression to MIDI track
function progressionToTrack(progression: ChordProgression, tempo: number) {
  const track = new Track();
  track.setTempo(tempo);

  // Add each chord sequentially
  for (const chord of progression.chords) {
    const noteEvent = new NoteEvent({
      pitch: chord.notes,
      duration: `${chord.durationBeats}`,
      velocity: 80,
    });
    track.addEvent(noteEvent);
  }

  return track;
}

// Export single chord as MIDI blob
export function exportChordToMidi(chord: Chord, tempo: number): Blob {
  const track = chordToTrack(chord, tempo);
  const writer = new Writer([track]);
  const dataUri = writer.dataUri();

  // Convert data URI to Blob
  const byteString = atob(dataUri.split(',')[1]);
  const mimeString = dataUri.split(',')[0].split(':')[1].split(';')[0];
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }
  return new Blob([ab], { type: mimeString });
}

// Export chord progression as MIDI blob
export function exportProgressionToMidi(progression: ChordProgression, tempo: number): Blob {
  const track = progressionToTrack(progression, tempo);
  const writer = new Writer([track]);
  const dataUri = writer.dataUri();

  // Convert data URI to Blob
  const byteString = atob(dataUri.split(',')[1]);
  const mimeString = dataUri.split(',')[0].split(':')[1].split(';')[0];
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }
  return new Blob([ab], { type: mimeString });
}

// Get filename for chord MIDI
export function getChordFilename(chord: Chord): string {
  return `${chord.displayName.replace(/[^a-zA-Z0-9]/g, '')}.mid`;
}

// Get filename for progression MIDI
export function getProgressionFilename(progression: ChordProgression): string {
  const chordNames = progression.chords.map(c => c.displayName).join('-');
  return `${progression.label.replace(/\s+/g, '_')}_${chordNames.replace(/[^a-zA-Z0-9-]/g, '')}.mid`;
}

// Create a download link for MIDI
export function downloadMidi(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Check if running in Electron
export function isElectron(): boolean {
  return !!(window.electronAPI?.isElectron);
}

// Convert blob to base64
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = (reader.result as string).split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// Create MIDI file for native drag (Electron only)
export async function createMidiFileForDrag(blob: Blob, filename: string): Promise<string | null> {
  if (!isElectron()) return null;

  try {
    const base64 = await blobToBase64(blob);
    const filePath = await window.electronAPI!.createMidiFile(base64, filename);
    return filePath;
  } catch (error) {
    console.error('Failed to create MIDI file:', error);
    return null;
  }
}
