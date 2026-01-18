// Note names (C, C#, D, etc.)
export type NoteName = 'C' | 'C#' | 'D' | 'D#' | 'E' | 'F' | 'F#' | 'G' | 'G#' | 'A' | 'A#' | 'B';
export type ScaleType = 'major' | 'minor';
// 借用元モード（モーダルインターチェンジ用）
export type BorrowedFrom = 'parallel-minor' | 'parallel-major' | null;
export type BasslinePattern = 'none' | 'root-only' | 'root-fifth' | 'walking' | 'syncopated' | 'octave';
export type ChordPattern = 'sustain' | 'arpeggio-up' | 'arpeggio-down' | 'staccato' | 'strum';

// Key definition
export interface Key {
  root: NoteName;
  scale: ScaleType;
}

// Chord quality
export type ChordQuality =
  | 'maj' | 'min' | 'dim' | 'aug'
  | 'maj7' | 'min7' | '7' | 'dim7' | 'm7b5'
  | 'maj9' | 'min9' | '9'
  | 'maj11' | 'min11' | '11'
  | 'maj13' | 'min13' | '13'
  | 'sus2' | 'sus4' | 'add9';

// Single chord
export interface Chord {
  id: string;
  root: NoteName;
  quality: ChordQuality;
  notes: number[]; // MIDI note numbers
  displayName: string;
  durationBeats: number;
  borrowedFrom?: BorrowedFrom; // 借用元モード（nullまたはundefinedの場合はダイアトニック）
  borrowedDegree?: string; // 借用度数（例: "♭VI", "iv"）
}

// Chord progression
export interface ChordProgression {
  id: string;
  chords: Chord[];
  label: string; // "Main", "Bridge 1", "Bridge 2"
}

// Genre options
export type Genre =
  | 'Lo-Fi' | 'Neo Soul' | 'Jazz' | 'Pop' | 'R&B' | 'Rock' | 'EDM' | 'Hip Hop' | 'Funk'
  | 'House' | 'UK Garage' | 'Future Bass'
  | 'Drum & Bass' | 'Trance' | 'Techno' | 'Dubstep' | 'Ambient'
  | 'Bossa Nova' | 'Reggae' | 'Country' | 'Blues' | 'Gospel' | 'Metal'
  | 'Latin' | 'City Pop';

// Mood options
export type Mood = 'Uplifting' | 'Melancholic' | 'Chill' | 'Dark' | 'Dreamy' | 'Energetic';

// Sound type options
export type SoundType = 'sine' | 'piano' | 'pad';

// App settings
export interface AppSettings {
  key: Key;
  tempo: number;
  genre: Genre;
  mood: Mood;
  soundType: SoundType;
}

// App state
export interface AppState {
  settings: AppSettings;
  mainProgression: ChordProgression;
  bridgeProgressions: ChordProgression[];
}

// Action types for reducer
export type AppAction =
  | { type: 'SET_KEY'; payload: Key }
  | { type: 'SET_TEMPO'; payload: number }
  | { type: 'SET_GENRE'; payload: Genre }
  | { type: 'SET_MOOD'; payload: Mood }
  | { type: 'SET_SOUND_TYPE'; payload: SoundType }
  | { type: 'GENERATE_PROGRESSIONS' }
  | { type: 'REGENERATE_MAIN' }
  | { type: 'REGENERATE_BRIDGE'; payload: number }
  | { type: 'SWAP_CHORD'; payload: { sourceProgId: string; targetProgId: string; sourceIdx: number; targetIdx: number } }
  | { type: 'SET_PROGRESSIONS'; payload: { main: ChordProgression; bridges: ChordProgression[] } }
  | { type: 'INSERT_CHORD'; payload: { progressionId: string; insertIndex: number; newChord: Chord } }
  | { type: 'REGENERATE_SINGLE_CHORD'; payload: { progressionId: string; chordIndex: number; newChord: Chord } }
  | { type: 'UPDATE_CHORD_DURATION'; payload: { progressionId: string; chordIndex: number; durationBeats: number } }
  | { type: 'APPLY_MODAL_INTERCHANGE'; payload: { progressionId: string; chordIndex: number; newChord: Chord } }
  | { type: 'APPLY_SPECIFIC_BORROWED_CHORD'; payload: { progressionId: string; chordIndex: number; newChord: Chord } }
  | { type: 'EXTEND_PROGRESSION'; payload: { progressionId: string; newChords: Chord[] } }
  | { type: 'SHIFT_CHORD_DEGREE'; payload: { progressionId: string; chordIndex: number; newChord: Chord } };

