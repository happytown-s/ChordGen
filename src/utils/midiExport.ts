import MidiWriter from 'midi-writer-js';
import type { Chord, ChordProgression, BasslinePattern, ChordPattern, MelodyPattern } from '../types';
import { generateProgressionBassline, type BassNote } from './basslineGenerator';
import { generateProgressionChordNotes } from './chordPatternGenerator';
import { generateProgressionMelody } from './melodyGenerator';

const { Track, NoteEvent, Writer } = MidiWriter;

// 拍数をMIDIティック数に変換（128 ticks = 1拍 = 4分音符）
function beatsToTicks(beats: number): number {
  return Math.round(beats * 128);
}

// Convert chord to MIDI track
function chordToTrack(chord: Chord, tempo: number) {
  const track = new Track();
  track.setTempo(tempo);

  // Add all notes of the chord simultaneously
  // Use tick-based duration for precise bar alignment
  const noteEvent = new NoteEvent({
    pitch: chord.notes,
    duration: `T${beatsToTicks(chord.durationBeats)}`,
    velocity: 80,
  });
  track.addEvent(noteEvent);

  return track;
}

// Convert chord progression to MIDI track (chords only)
function progressionToChordTrack(progression: ChordProgression, tempo: number) {
  const track = new Track();
  track.setTempo(tempo);

  // Add each chord sequentially with tick-based duration
  for (const chord of progression.chords) {
    const noteEvent = new NoteEvent({
      pitch: chord.notes,
      duration: `T${beatsToTicks(chord.durationBeats)}`,
      velocity: 80,
    });
    track.addEvent(noteEvent);
  }

  return track;
}

// Convert chord progression to MIDI track with pattern
function progressionToChordTrackWithPattern(
  progression: ChordProgression,
  tempo: number,
  chordPattern: ChordPattern,
  strumAmount: number = 50
) {
  // サステインの場合は既存ロジックを使用
  if (chordPattern === 'sustain') {
    return progressionToChordTrack(progression, tempo);
  }

  const track = new Track();
  track.setTempo(tempo);

  // パターンに基づいたノートを生成
  const chordNotes = generateProgressionChordNotes(progression.chords, chordPattern, strumAmount);

  let currentTick = 0;

  for (const note of chordNotes) {
    const noteStartTick = beatsToTicks(note.startBeat);

    // 休符（ウェイト）を追加
    if (noteStartTick > currentTick) {
      const waitTicks = noteStartTick - currentTick;
      track.addEvent(new NoteEvent({
        pitch: [0],
        duration: `T${waitTicks}`,
        velocity: 0,
        wait: `T${waitTicks}`,
      }));
      currentTick = noteStartTick;
    }

    // ノートを追加
    const noteDurationTicks = beatsToTicks(note.durationBeats);
    track.addEvent(new NoteEvent({
      pitch: [note.midiNote],
      duration: `T${noteDurationTicks}`,
      velocity: Math.round(note.velocity),
    }));
    currentTick = noteStartTick + noteDurationTicks;
  }

  return track;
}

// Convert bassline to MIDI track
function basslineToTrack(bassNotes: BassNote[], tempo: number) {
  const track = new Track();
  track.setTempo(tempo);

  let currentTick = 0;

  for (const note of bassNotes) {
    const noteStartTick = beatsToTicks(note.startBeat);

    // 休符（ウェイト）を追加
    if (noteStartTick > currentTick) {
      track.addEvent(new NoteEvent({
        pitch: [0], // 空のノート（休符として機能）
        duration: `T${noteStartTick - currentTick}`,
        velocity: 0,
        wait: `T${noteStartTick - currentTick}`,
      }));
      currentTick = noteStartTick;
    }

    // ベースノートを追加
    const noteDurationTicks = beatsToTicks(note.durationBeats);
    track.addEvent(new NoteEvent({
      pitch: [note.midiNote],
      duration: `T${noteDurationTicks}`,
      velocity: note.velocity,
    }));
    currentTick = noteStartTick + noteDurationTicks;
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

// Convert melody to MIDI track
function melodyToTrack(melodyNotes: import('./melodyGenerator').MelodyNote[], tempo: number) {
  const track = new Track();
  track.setTempo(tempo);

  // 楽器指定（Lead系など）
  // Program Change: 80 (Square Lead) or 73 (Flute) etc.
  try {
    // @ts-ignore - ProgramChangeEvent might be missing in types
    track.addEvent(new MidiWriter.ProgramChangeEvent({ instrument: 80 }));
  } catch (e) {
    console.warn('ProgramChangeEvent not supported or failed', e);
  }

  let currentTick = 0;

  for (const note of melodyNotes) {
    const noteStartTick = beatsToTicks(note.startBeat);

    // 休符
    if (noteStartTick > currentTick) {
      const waitTicks = noteStartTick - currentTick;
      track.addEvent(new NoteEvent({
        pitch: [0],
        duration: `T${waitTicks}`,
        velocity: 0,
        wait: `T${waitTicks}`,
      }));
      currentTick = noteStartTick;
    }

    // ノート
    const noteDurationTicks = beatsToTicks(note.durationBeats);
    track.addEvent(new NoteEvent({
      pitch: [note.midiNote],
      duration: `T${noteDurationTicks}`,
      velocity: note.velocity,
    }));
    currentTick = noteStartTick + noteDurationTicks;
  }

  return track;
}

// Export chord progression as MIDI blob (with optional bassline, chord pattern, and melody pattern)
export function exportProgressionToMidi(
  progression: ChordProgression,
  tempo: number,
  basslinePattern: BasslinePattern = 'none',
  chordPattern: ChordPattern = 'sustain',
  strumAmount: number = 50,
  melodyPattern: MelodyPattern = 'none',
  key?: import('../types').Key // メロディ生成にキーが必要
): Blob {
  const tracks = [];

  // コードトラック（パターン対応）
  const chordTrack = progressionToChordTrackWithPattern(progression, tempo, chordPattern, strumAmount);
  tracks.push(chordTrack);

  // ベースライントラック（パターンが指定されている場合）
  if (basslinePattern !== 'none') {
    const bassNotes = generateProgressionBassline(progression.chords, basslinePattern);
    if (bassNotes.length > 0) {
      const bassTrack = basslineToTrack(bassNotes, tempo);
      tracks.push(bassTrack);
    }
  }

  // メロディトラック（パターンが指定されている場合）
  if (melodyPattern !== 'none' && key) {
    const melodyNotes = generateProgressionMelody(progression.chords, key, melodyPattern);
    if (melodyNotes.length > 0) {
      const melodyTrack = melodyToTrack(melodyNotes, tempo);
      tracks.push(melodyTrack);
    }
  }

  const writer = new Writer(tracks);
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
