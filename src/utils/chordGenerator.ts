import type { Key, Genre, Mood, Chord, ChordProgression, ChordQuality, NoteName } from '../types';
import { getChordDisplayName, getScaleDegreeNote, getVoicedChordNotes, NOTE_TO_MIDI, NOTE_NAMES, getScaleNotes, getRandomBorrowableChord } from './musicTheory';

// Generate unique ID
function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

// Chord progression templates based on scale degrees
// Format: [degree, quality][]
type ProgressionTemplate = [number, ChordQuality][];

// Common progressions for different genres/moods
const PROGRESSION_TEMPLATES: Record<string, ProgressionTemplate[]> = {
  // Lo-Fi progressions (jazzy, relaxed)
  'Lo-Fi_Chill': [
    [[2, 'min7'], [5, '7'], [1, 'maj7'], [6, 'min7']],
    [[1, 'maj9'], [6, 'min9'], [2, 'min7'], [5, '9']],
    [[4, 'maj7'], [3, 'min7'], [2, 'min7'], [1, 'maj9']],
  ],
  'Lo-Fi_Melancholic': [
    [[6, 'min7'], [4, 'maj7'], [1, 'maj7'], [5, '7']],
    [[2, 'm7b5'], [5, '7'], [1, 'min7'], [4, 'maj7']],
    [[1, 'min9'], [4, 'maj7'], [6, 'min7'], [5, '7']],
  ],
  'Lo-Fi_Dreamy': [
    [[1, 'maj9'], [3, 'min7'], [4, 'maj9'], [1, 'maj7']],
    [[6, 'min9'], [2, 'min7'], [5, '9'], [1, 'maj9']],
  ],

  // Neo Soul progressions (complex, jazzy)
  'Neo Soul_Chill': [
    [[2, 'min9'], [5, '9'], [1, 'maj9'], [1, 'maj9']],
    [[4, 'maj9'], [3, 'min9'], [6, 'min9'], [2, 'min7']],
    [[1, 'maj9'], [4, 'maj7'], [3, 'min7'], [6, 'min9']],
  ],
  'Neo Soul_Uplifting': [
    [[1, 'maj9'], [5, '9'], [6, 'min9'], [4, 'maj9']],
    [[2, 'min9'], [5, '9'], [1, 'maj9'], [6, 'min7']],
  ],
  'Neo Soul_Dreamy': [
    [[1, 'maj9'], [2, 'min9'], [3, 'min7'], [4, 'maj9']],
    [[6, 'min9'], [5, '9'], [4, 'maj9'], [1, 'maj9']],
  ],

  // Jazz progressions
  'Jazz_Chill': [
    [[2, 'min7'], [5, '7'], [1, 'maj7'], [6, 'min7']],
    [[1, 'maj7'], [6, 'min7'], [2, 'min7'], [5, '7']],
  ],
  'Jazz_Melancholic': [
    [[1, 'min7'], [4, 'min7'], [5, '7'], [1, 'min7']],
    [[2, 'm7b5'], [5, '7'], [1, 'min7'], [6, 'dim7']],
  ],
  'Jazz_Uplifting': [
    [[1, 'maj7'], [2, 'min7'], [3, 'min7'], [4, 'maj7']],
    [[1, 'maj7'], [4, 'maj7'], [5, '7'], [1, 'maj7']],
  ],

  // Pop progressions
  'Pop_Uplifting': [
    [[1, 'maj'], [5, 'maj'], [6, 'min'], [4, 'maj']],
    [[1, 'maj'], [4, 'maj'], [6, 'min'], [5, 'maj']],
    [[4, 'maj'], [1, 'maj'], [5, 'maj'], [6, 'min']],
  ],
  'Pop_Melancholic': [
    [[6, 'min'], [4, 'maj'], [1, 'maj'], [5, 'maj']],
    [[1, 'min'], [6, 'maj'], [3, 'maj'], [7, 'maj']],
  ],
  'Pop_Energetic': [
    [[1, 'maj'], [5, 'maj'], [6, 'min'], [4, 'maj']],
    [[1, 'maj'], [3, 'min'], [4, 'maj'], [5, 'maj']],
  ],
  'Pop_Chill': [
    [[1, 'maj7'], [5, 'maj'], [6, 'min7'], [4, 'maj7']],
    [[1, 'add9'], [5, 'sus4'], [6, 'min'], [4, 'add9']],
  ],

  // R&B progressions
  'R&B_Chill': [
    [[1, 'maj7'], [6, 'min7'], [4, 'maj7'], [5, '7']],
    [[2, 'min7'], [5, '7'], [1, 'maj7'], [4, 'maj7']],
  ],
  'R&B_Uplifting': [
    [[1, 'maj9'], [4, 'maj7'], [5, '7'], [6, 'min7']],
    [[1, 'maj7'], [5, '7'], [4, 'maj7'], [1, 'maj7']],
  ],
  'R&B_Melancholic': [
    [[6, 'min7'], [5, '7'], [4, 'maj7'], [1, 'maj7']],
    [[2, 'min7'], [5, '7'], [1, 'min7'], [4, 'min7']],
  ],

  // Rock progressions
  'Rock_Energetic': [
    [[1, 'maj'], [4, 'maj'], [5, 'maj'], [1, 'maj']],
    [[1, 'maj'], [5, 'maj'], [4, 'maj'], [1, 'maj']],
  ],
  'Rock_Dark': [
    [[1, 'min'], [6, 'maj'], [7, 'maj'], [1, 'min']],
    [[1, 'min'], [4, 'min'], [5, 'min'], [1, 'min']],
  ],
  'Rock_Uplifting': [
    [[1, 'maj'], [4, 'maj'], [1, 'maj'], [5, 'maj']],
    [[1, 'maj'], [5, 'maj'], [6, 'min'], [4, 'maj']],
  ],

  // EDM progressions (anthemic, driving)
  'EDM_Energetic': [
    [[1, 'maj'], [5, 'maj'], [6, 'min'], [4, 'maj']],
    [[6, 'min'], [4, 'maj'], [1, 'maj'], [5, 'maj']],
    [[1, 'maj'], [4, 'maj'], [6, 'min'], [5, 'maj']],
  ],
  'EDM_Uplifting': [
    [[1, 'maj'], [5, 'maj'], [6, 'min'], [4, 'maj']],
    [[4, 'maj'], [1, 'maj'], [5, 'maj'], [6, 'min']],
    [[1, 'maj'], [3, 'min'], [4, 'maj'], [5, 'maj']],
  ],
  'EDM_Dark': [
    [[6, 'min'], [4, 'maj'], [1, 'maj'], [5, 'maj']],
    [[1, 'min'], [6, 'maj'], [3, 'maj'], [7, 'maj']],
    [[6, 'min'], [7, 'maj'], [1, 'maj'], [1, 'maj']],
  ],
  'EDM_Chill': [
    [[1, 'maj7'], [5, 'maj'], [6, 'min7'], [4, 'maj7']],
    [[6, 'min7'], [4, 'maj7'], [1, 'maj7'], [5, '7']],
  ],

  // Hip Hop progressions (trap, boom bap)
  'Hip Hop_Chill': [
    [[1, 'min7'], [4, 'min7'], [6, 'maj7'], [5, '7']],
    [[6, 'min7'], [5, '7'], [4, 'maj7'], [1, 'min7']],
    [[2, 'min7'], [5, '7'], [1, 'min7'], [1, 'min7']],
  ],
  'Hip Hop_Dark': [
    [[1, 'min'], [6, 'maj'], [7, 'maj'], [5, 'maj']],
    [[1, 'min7'], [1, 'min7'], [4, 'min7'], [5, '7']],
    [[6, 'min'], [7, 'maj'], [1, 'min'], [5, 'maj']],
  ],
  'Hip Hop_Melancholic': [
    [[6, 'min7'], [4, 'maj7'], [1, 'maj7'], [5, '7']],
    [[1, 'min9'], [4, 'min7'], [6, 'maj7'], [5, '7']],
    [[2, 'm7b5'], [5, '7'], [1, 'min7'], [6, 'maj7']],
  ],
  'Hip Hop_Energetic': [
    [[1, 'min'], [4, 'min'], [5, 'maj'], [1, 'min']],
    [[6, 'min'], [5, 'maj'], [4, 'maj'], [1, 'min']],
  ],

  // Funk progressions (groovy, syncopated)
  'Funk_Energetic': [
    [[1, '7'], [4, '7'], [1, '7'], [5, '7']],
    [[1, '9'], [4, '7'], [1, '9'], [1, '9']],
    [[2, 'min7'], [5, '7'], [1, '7'], [1, '7']],
  ],
  'Funk_Chill': [
    [[1, 'maj9'], [4, '9'], [1, 'maj9'], [5, '9']],
    [[2, 'min7'], [5, '9'], [1, 'maj7'], [4, '7']],
    [[1, '7'], [6, 'min7'], [2, 'min7'], [5, '7']],
  ],
  'Funk_Uplifting': [
    [[1, 'maj7'], [4, '7'], [5, '7'], [1, 'maj7']],
    [[1, '9'], [4, '9'], [1, '9'], [5, '9']],
    [[4, '7'], [1, '7'], [5, '7'], [1, '7']],
  ],
  'Funk_Dark': [
    [[1, 'min7'], [4, 'min7'], [5, '7'], [1, 'min7']],
    [[1, 'min7'], [6, 'maj7'], [2, 'm7b5'], [5, '7']],
  ],

  // House progressions (4つ打ち、アンセミック)
  'House_Energetic': [
    [[6, 'min'], [4, 'maj'], [1, 'maj'], [5, 'maj']],  // Classic house
    [[1, 'min7'], [5, '7'], [6, 'maj7'], [4, 'maj7']], // Deep house
    [[4, 'maj'], [1, 'maj'], [5, 'maj'], [6, 'min']],  // Piano house
  ],
  'House_Uplifting': [
    [[1, 'maj'], [5, 'maj'], [6, 'min'], [4, 'maj']],  // Euphoric house
    [[4, 'maj7'], [5, 'maj'], [6, 'min'], [1, 'maj']], // Progressive house
    [[1, 'maj'], [4, 'maj'], [1, 'maj'], [5, 'maj']],  // Classic pump
  ],
  'House_Chill': [
    [[2, 'min7'], [5, '7'], [1, 'maj7'], [4, 'maj7']], // Jazzy house
    [[1, 'maj9'], [6, 'min7'], [4, 'maj9'], [5, '7']], // Deep chill
    [[6, 'min7'], [2, 'min7'], [5, '7'], [1, 'maj7']], // Soulful house
  ],
  'House_Dreamy': [
    [[1, 'maj7'], [4, 'maj9'], [6, 'min7'], [5, 'sus4']], // Melodic house
    [[4, 'maj9'], [5, 'maj'], [6, 'min9'], [1, 'maj7']],
  ],

  // UK Garage progressions (2ステップ、シンコペーション)
  'UK Garage_Chill': [
    [[1, 'maj7'], [6, 'min7'], [2, 'min7'], [5, '7']],   // Classic 2step
    [[4, 'maj7'], [3, 'min7'], [6, 'min7'], [5, '7']],   // UKG staple
    [[1, 'maj9'], [4, 'maj7'], [5, '7'], [6, 'min7']],
  ],
  'UK Garage_Uplifting': [
    [[1, 'maj7'], [5, '7'], [6, 'min7'], [4, 'maj7']],   // Speed garage
    [[4, 'maj7'], [1, 'maj7'], [5, '7'], [6, 'min7']],
    [[1, 'maj'], [4, 'maj7'], [6, 'min7'], [5, '7']],    // Vocal UKG
  ],
  'UK Garage_Energetic': [
    [[6, 'min7'], [5, '7'], [4, 'maj7'], [1, 'maj7']],   // Bassline
    [[1, 'maj7'], [4, 'maj7'], [5, '7'], [5, '7']],      // 4x4 garage
    [[2, 'min7'], [5, '7'], [1, 'maj'], [6, 'min7']],
  ],
  'UK Garage_Dreamy': [
    [[1, 'maj9'], [6, 'min9'], [4, 'maj9'], [5, '9']],   // Chilled UKG
    [[4, 'maj9'], [5, 'add9'], [6, 'min7'], [1, 'maj9']],
  ],

  // Future Bass progressions (エモーショナル、シンセリード)
  'Future Bass_Uplifting': [
    [[6, 'min'], [4, 'maj'], [1, 'maj'], [5, 'maj']],    // Classic FutureBass drop
    [[1, 'maj'], [5, 'maj'], [6, 'min'], [4, 'maj']],    // Euphoric
    [[4, 'maj'], [5, 'maj'], [6, 'min'], [1, 'maj']],    // Kawaii future
  ],
  'Future Bass_Energetic': [
    [[6, 'min7'], [4, 'maj7'], [1, 'maj7'], [5, '7']],
    [[1, 'add9'], [5, 'add9'], [6, 'min'], [4, 'add9']], // Sparkling
    [[4, 'maj'], [1, 'maj'], [5, 'sus4'], [5, 'maj']],
  ],
  'Future Bass_Dreamy': [
    [[1, 'maj7'], [4, 'maj9'], [6, 'min7'], [5, 'add9']], // Melodic FB
    [[6, 'min9'], [4, 'maj9'], [1, 'maj9'], [5, 'add9']],
    [[4, 'add9'], [5, 'add9'], [6, 'min7'], [1, 'maj7']],
  ],
  'Future Bass_Melancholic': [
    [[6, 'min7'], [3, 'min7'], [4, 'maj7'], [1, 'maj7']], // Sad future
    [[1, 'min7'], [6, 'maj7'], [4, 'maj7'], [5, '7']],
    [[6, 'min'], [4, 'maj'], [5, 'maj'], [3, 'min']],
  ],

  // Drum & Bass progressions (リキッドDnB、ダーク系)
  'Drum & Bass_Chill': [
    [[1, 'min7'], [4, 'min7'], [6, 'maj7'], [5, '7']],   // Liquid DnB
    [[6, 'min7'], [4, 'maj7'], [1, 'maj7'], [5, '7']],
    [[2, 'min7'], [5, '7'], [1, 'maj7'], [6, 'min7']],
  ],
  'Drum & Bass_Dark': [
    [[1, 'min'], [6, 'maj'], [7, 'maj'], [5, 'maj']],    // Neurofunk
    [[1, 'min7'], [1, 'min7'], [4, 'min7'], [5, '7']],
    [[6, 'min'], [7, 'dim'], [1, 'min'], [5, '7']],
  ],
  'Drum & Bass_Uplifting': [
    [[1, 'maj7'], [5, '7'], [6, 'min7'], [4, 'maj7']],
    [[4, 'maj7'], [5, 'maj'], [6, 'min7'], [1, 'maj7']],
  ],
  'Drum & Bass_Energetic': [
    [[6, 'min'], [4, 'maj'], [1, 'maj'], [5, 'maj']],
    [[1, 'min'], [4, 'min'], [5, 'maj'], [1, 'min']],
  ],

  // Trance progressions (アンセミック、リフト)
  'Trance_Uplifting': [
    [[6, 'min'], [4, 'maj'], [1, 'maj'], [5, 'maj']],     // Classic trance
    [[1, 'min'], [6, 'maj'], [3, 'maj'], [7, 'maj']],     // Emotional trance
    [[4, 'maj'], [5, 'maj'], [6, 'min'], [1, 'maj']],
  ],
  'Trance_Energetic': [
    [[1, 'min'], [5, 'maj'], [6, 'maj'], [4, 'maj']],
    [[6, 'min'], [5, 'maj'], [4, 'maj'], [1, 'min']],
  ],
  'Trance_Dreamy': [
    [[1, 'maj7'], [5, 'sus4'], [6, 'min7'], [4, 'maj7']],
    [[4, 'add9'], [5, 'add9'], [6, 'min'], [1, 'maj7']],
  ],
  'Trance_Melancholic': [
    [[6, 'min'], [3, 'min'], [4, 'maj'], [1, 'maj']],
    [[1, 'min'], [6, 'maj'], [4, 'maj'], [5, 'maj']],
  ],

  // Techno progressions (ミニマル、ハイプノティック)
  'Techno_Dark': [
    [[1, 'min'], [1, 'min'], [4, 'min'], [4, 'min']],     // Minimal
    [[1, 'min7'], [6, 'maj'], [1, 'min7'], [1, 'min7']],
    [[5, 'min'], [1, 'min'], [5, 'min'], [1, 'min']],
  ],
  'Techno_Energetic': [
    [[1, 'min'], [4, 'min'], [1, 'min'], [5, 'min']],
    [[6, 'min'], [6, 'min'], [4, 'maj'], [4, 'maj']],
  ],
  'Techno_Chill': [
    [[1, 'min7'], [4, 'min7'], [1, 'min7'], [1, 'min7']],
    [[2, 'min7'], [5, '7'], [1, 'min7'], [1, 'min7']],
  ],

  // Dubstep progressions (ダークでヘビー)
  'Dubstep_Dark': [
    [[1, 'min'], [6, 'maj'], [7, 'maj'], [5, 'maj']],     // Heavy
    [[1, 'min'], [1, 'min'], [6, 'maj'], [6, 'maj']],
    [[6, 'min'], [7, 'dim'], [1, 'min'], [5, 'maj']],
  ],
  'Dubstep_Energetic': [
    [[6, 'min'], [4, 'maj'], [1, 'maj'], [5, 'maj']],
    [[1, 'min'], [5, 'maj'], [6, 'maj'], [4, 'maj']],
  ],
  'Dubstep_Melancholic': [
    [[6, 'min7'], [4, 'maj7'], [1, 'maj7'], [5, '7']],
    [[1, 'min7'], [6, 'maj7'], [4, 'maj7'], [5, '7']],
  ],

  // Ambient progressions (浮遊感、アトモスフェリック)
  'Ambient_Dreamy': [
    [[1, 'maj7'], [4, 'maj9'], [6, 'min9'], [5, 'sus4']], // Ethereal
    [[4, 'add9'], [1, 'maj7'], [4, 'add9'], [1, 'maj7']],
    [[1, 'maj9'], [1, 'maj9'], [4, 'maj9'], [4, 'maj9']],
  ],
  'Ambient_Chill': [
    [[1, 'maj7'], [6, 'min7'], [4, 'maj7'], [4, 'maj7']],
    [[2, 'min9'], [5, 'add9'], [1, 'maj9'], [1, 'maj9']],
  ],
  'Ambient_Melancholic': [
    [[6, 'min9'], [4, 'maj9'], [1, 'maj9'], [5, 'sus4']],
    [[1, 'min9'], [4, 'min7'], [6, 'maj7'], [5, 'sus4']],
  ],

  // Bossa Nova progressions (ブラジリアンジャズ)
  'Bossa Nova_Chill': [
    [[1, 'maj7'], [2, 'min7'], [3, 'min7'], [6, 'min7']], // Jobim style
    [[2, 'min7'], [5, '7'], [1, 'maj7'], [6, 'min7']],
    [[1, 'maj9'], [2, 'min7'], [5, '7'], [1, 'maj7']],
  ],
  'Bossa Nova_Dreamy': [
    [[1, 'maj9'], [4, 'maj7'], [3, 'min7'], [6, 'min9']],
    [[2, 'm7b5'], [5, '7'], [1, 'maj9'], [4, 'maj7']],
  ],
  'Bossa Nova_Uplifting': [
    [[1, 'maj7'], [5, '7'], [6, 'min7'], [4, 'maj7']],
    [[1, 'maj7'], [4, 'maj7'], [3, 'min7'], [6, 'min7']],
  ],
  'Bossa Nova_Melancholic': [
    [[1, 'min7'], [4, 'min7'], [5, '7'], [1, 'min7']],
    [[2, 'm7b5'], [5, '7'], [1, 'min7'], [6, 'maj7']],
  ],

  // Reggae progressions (ジャマイカン)
  'Reggae_Chill': [
    [[1, 'maj'], [5, 'maj'], [1, 'maj'], [5, 'maj']],     // One Drop
    [[1, 'maj'], [4, 'maj'], [1, 'maj'], [5, 'maj']],
    [[1, 'maj7'], [4, 'maj7'], [1, 'maj7'], [5, '7']],
  ],
  'Reggae_Uplifting': [
    [[1, 'maj'], [4, 'maj'], [5, 'maj'], [1, 'maj']],
    [[6, 'min'], [5, 'maj'], [4, 'maj'], [1, 'maj']],
  ],
  'Reggae_Melancholic': [
    [[1, 'min'], [4, 'min'], [5, 'maj'], [1, 'min']],
    [[6, 'min'], [4, 'maj'], [1, 'min'], [5, 'maj']],
  ],

  // Country progressions (ナッシュビル)
  'Country_Uplifting': [
    [[1, 'maj'], [4, 'maj'], [1, 'maj'], [5, 'maj']],     // Nashville
    [[1, 'maj'], [5, 'maj'], [6, 'min'], [4, 'maj']],
    [[1, 'maj'], [4, 'maj'], [5, 'maj'], [1, 'maj']],
  ],
  'Country_Melancholic': [
    [[1, 'maj'], [6, 'min'], [4, 'maj'], [5, 'maj']],
    [[6, 'min'], [4, 'maj'], [1, 'maj'], [5, 'maj']],
  ],
  'Country_Chill': [
    [[1, 'maj7'], [4, 'maj'], [5, '7'], [1, 'maj']],
    [[1, 'add9'], [4, 'add9'], [5, 'sus4'], [1, 'add9']],
  ],

  // Blues progressions (12小節ブルース系)
  'Blues_Chill': [
    [[1, '7'], [4, '7'], [1, '7'], [5, '7']],             // 12-bar blues
    [[1, '7'], [1, '7'], [4, '7'], [1, '7']],
    [[1, '9'], [4, '7'], [1, '7'], [5, '7']],
  ],
  'Blues_Dark': [
    [[1, 'min7'], [4, 'min7'], [1, 'min7'], [5, '7']],    // Minor blues
    [[1, 'min7'], [4, 'min7'], [5, '7'], [1, 'min7']],
  ],
  'Blues_Melancholic': [
    [[1, '7'], [4, '7'], [5, '7'], [4, '7']],
    [[6, 'min7'], [2, 'min7'], [5, '7'], [1, '7']],
  ],
  'Blues_Uplifting': [
    [[1, '7'], [4, '7'], [1, '7'], [5, '7']],
    [[1, 'maj7'], [4, '7'], [1, 'maj7'], [5, '7']],
  ],

  // Gospel progressions (教会音楽)
  'Gospel_Uplifting': [
    [[4, 'maj7'], [5, '7'], [3, 'min7'], [6, 'min7']],    // Worship
    [[1, 'maj'], [4, 'maj'], [1, 'maj'], [5, 'maj']],
    [[4, 'maj7'], [3, 'min7'], [2, 'min7'], [5, '7']],
  ],
  'Gospel_Melancholic': [
    [[1, 'maj7'], [6, 'min7'], [4, 'maj7'], [5, '7']],
    [[2, 'min7'], [5, '7'], [1, 'maj7'], [6, 'min7']],
  ],
  'Gospel_Energetic': [
    [[1, 'maj'], [1, 'maj'], [4, 'maj'], [1, 'maj']],
    [[4, 'maj'], [5, 'maj'], [1, 'maj'], [1, 'maj']],
  ],
  'Gospel_Dreamy': [
    [[1, 'maj9'], [4, 'maj9'], [5, '9'], [1, 'maj9']],
    [[4, 'maj7'], [3, 'min7'], [6, 'min7'], [2, 'min7']],
  ],

  // Metal progressions (パワーコード、ダーク)
  'Metal_Dark': [
    [[1, 'min'], [6, 'maj'], [7, 'maj'], [1, 'min']],     // Power metal
    [[1, 'min'], [2, 'dim'], [5, 'maj'], [1, 'min']],
    [[1, 'min'], [4, 'min'], [5, 'min'], [1, 'min']],
  ],
  'Metal_Energetic': [
    [[1, 'min'], [5, 'maj'], [6, 'maj'], [4, 'maj']],
    [[1, 'min'], [6, 'maj'], [3, 'maj'], [7, 'maj']],
  ],
  'Metal_Melancholic': [
    [[6, 'min'], [4, 'maj'], [1, 'maj'], [5, 'maj']],
    [[1, 'min'], [4, 'min'], [6, 'maj'], [5, 'maj']],
  ],

  // Latin progressions (サルサ、ボレロ)
  'Latin_Energetic': [
    [[1, 'maj'], [4, 'maj'], [5, '7'], [1, 'maj']],       // Salsa
    [[2, 'min7'], [5, '7'], [1, 'maj7'], [1, 'maj7']],
    [[1, 'maj'], [6, 'min'], [2, 'min7'], [5, '7']],
  ],
  'Latin_Chill': [
    [[1, 'maj7'], [2, 'min7'], [5, '7'], [1, 'maj7']],    // Bolero
    [[6, 'min7'], [2, 'min7'], [5, '7'], [1, 'maj7']],
  ],
  'Latin_Uplifting': [
    [[1, 'maj'], [4, 'maj'], [1, 'maj'], [5, '7']],
    [[4, 'maj'], [5, '7'], [1, 'maj'], [6, 'min']],
  ],
  'Latin_Melancholic': [
    [[1, 'min7'], [4, 'min7'], [5, '7'], [1, 'min7']],
    [[6, 'min7'], [5, '7'], [4, 'maj7'], [1, 'min7']],
  ],

  // City Pop progressions (80年代日本シティポップ)
  'City Pop_Chill': [
    [[1, 'maj7'], [3, 'min7'], [6, 'min7'], [2, 'min7']], // 定番進行
    [[4, 'maj7'], [3, 'min7'], [2, 'min7'], [5, '7']],    // 王道パターン
    [[1, 'maj9'], [6, 'min7'], [2, 'min7'], [5, '9']],
  ],
  'City Pop_Uplifting': [
    [[1, 'maj7'], [5, '7'], [6, 'min7'], [4, 'maj7']],
    [[4, 'maj7'], [5, '7'], [3, 'min7'], [6, 'min7']],
    [[1, 'maj7'], [2, 'min7'], [3, 'min7'], [4, 'maj7']],
  ],
  'City Pop_Dreamy': [
    [[1, 'maj9'], [4, 'maj7'], [3, 'min7'], [6, 'min9']], // Midnight vibes
    [[2, 'min9'], [5, '9'], [1, 'maj9'], [6, 'min7']],
    [[4, 'add9'], [5, 'add9'], [6, 'min7'], [1, 'maj7']],
  ],
  'City Pop_Melancholic': [
    [[6, 'min7'], [5, '7'], [4, 'maj7'], [3, 'min7']],
    [[1, 'maj7'], [6, 'min7'], [4, 'maj7'], [5, 'sus4']],
    [[2, 'min7'], [5, '7'], [1, 'maj7'], [4, 'maj7']],
  ],
};

// Default/fallback progressions
const DEFAULT_PROGRESSIONS: ProgressionTemplate[] = [
  [[1, 'maj7'], [4, 'maj7'], [5, '7'], [1, 'maj7']],
  [[2, 'min7'], [5, '7'], [1, 'maj7'], [6, 'min7']],
  [[1, 'maj'], [5, 'maj'], [6, 'min'], [4, 'maj']],
];

// Get progression templates for a genre/mood combination
function getTemplates(genre: Genre, mood: Mood): ProgressionTemplate[] {
  const key = `${genre}_${mood}`;

  // Try exact match
  if (PROGRESSION_TEMPLATES[key]) {
    return PROGRESSION_TEMPLATES[key];
  }

  // Try genre with any mood
  const genreTemplates = Object.entries(PROGRESSION_TEMPLATES)
    .filter(([k]) => k.startsWith(`${genre}_`))
    .flatMap(([, templates]) => templates);

  if (genreTemplates.length > 0) {
    return genreTemplates;
  }

  // Fallback
  return DEFAULT_PROGRESSIONS;
}

// Adjust chord for minor key
function adjustForMinorKey(degree: number, quality: ChordQuality, key: Key): [number, ChordQuality] {
  if (key.scale === 'minor') {
    // Adjust qualities for natural minor scale
    if (degree === 1 && quality === 'maj') return [1, 'min'];
    if (degree === 1 && quality === 'maj7') return [1, 'min7'];
    if (degree === 1 && quality === 'maj9') return [1, 'min9'];
    if (degree === 4 && quality === 'maj') return [4, 'min'];
    if (degree === 4 && quality === 'maj7') return [4, 'min7'];
    if (degree === 5 && quality === 'maj') return [5, 'min'];
    if (degree === 6 && quality === 'min') return [6, 'maj'];
    if (degree === 6 && quality === 'min7') return [6, 'maj7'];
  }
  return [degree, quality];
}

// Probabilistically enrich a chord quality based on genre
function enrichChord(quality: ChordQuality, genre: Genre): ChordQuality {
  // Enrichment probabilities (0.0 to 1.0)
  const ENRICHMENT_CHANCE: Record<Genre, number> = {
    'Neo Soul': 0.6,
    'Jazz': 0.5,
    'Lo-Fi': 0.4,
    'R&B': 0.3,
    'Hip Hop': 0.2,
    'Funk': 0.3,
    'Rock': 0.0,
    'Pop': 0.1,
    'EDM': 0.1,
    'House': 0.2,
    'UK Garage': 0.4,
    'Future Bass': 0.3,
    'Drum & Bass': 0.3,
    'Trance': 0.1,
    'Techno': 0.0,
    'Dubstep': 0.1,
    'Ambient': 0.5,
    'Bossa Nova': 0.6,
    'Reggae': 0.1,
    'Country': 0.0,
    'Blues': 0.2,
    'Gospel': 0.4,
    'Metal': 0.0,
    'Latin': 0.2,
    'City Pop': 0.5,
  };

  const chance = ENRICHMENT_CHANCE[genre] || 0;
  if (Math.random() > chance) return quality;

  // Enrichment rules map
  const upgrades: Partial<Record<ChordQuality, ChordQuality[]>> = {
    'maj7': ['maj9', 'maj13'],
    'min7': ['min9', 'min11'],
    '7': ['9', '13'],
    'maj9': ['maj13'],
    'min9': ['min11'],
    '9': ['13'],
  };

  const options = upgrades[quality];
  if (options && options.length > 0) {
    return pickRandom(options);
  }

  return quality;
}

// Create a chord from scale degree with voice leading
function createChordFromDegree(
  key: Key,
  degree: number,
  quality: ChordQuality,
  previousNotes: number[] | null,
  genre?: Genre, // Inserted optional genre parameter
  durationBeats: number = 4
): Chord {
  let [adjustedDegree, adjustedQuality] = adjustForMinorKey(degree, quality, key);

  // Apply probabilistic enrichment if genre is provided
  if (genre) {
    adjustedQuality = enrichChord(adjustedQuality, genre);
  }

  const root = getScaleDegreeNote(key, adjustedDegree);

  // Determine if we should use open voicing based on genre
  const openVoicingGenres: Genre[] = ['Jazz', 'Neo Soul', 'Lo-Fi'];
  const useOpenVoicing = genre ? openVoicingGenres.includes(genre) : false;

  // Use voiced chord notes with smooth voice leading
  const notes = getVoicedChordNotes(root, adjustedQuality, previousNotes, undefined, useOpenVoicing);

  return {
    id: generateId(),
    root,
    quality: adjustedQuality,
    notes,
    displayName: getChordDisplayName(root, adjustedQuality),
    durationBeats,
  };
}

// Generate a chord progression with smooth voice leading
function generateProgressionFromTemplate(
  key: Key,
  template: ProgressionTemplate,
  label: string,
  genre?: Genre
): ChordProgression {
  const chords: Chord[] = [];

  for (const [degree, quality] of template) {
    const previousNotes = chords.length > 0 ? chords[chords.length - 1].notes : null;
    const chord = createChordFromDegree(key, degree, quality, previousNotes, genre);
    chords.push(chord);
  }

  return {
    id: generateId(),
    chords,
    label,
  };
}

// Pick random item from array
function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Pick multiple unique random items
function pickMultipleRandom<T>(arr: T[], count: number): T[] {
  const result = [...arr];
  const k = Math.min(count, result.length);

  for (let i = 0; i < k; i++) {
    const j = i + Math.floor(Math.random() * (result.length - i));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result.slice(0, k);
}

// Main export: Generate main + bridge progressions
export function generateProgressions(
  key: Key,
  genre: Genre,
  mood: Mood
): { main: ChordProgression; bridges: ChordProgression[] } {
  const templates = getTemplates(genre, mood);

  // Need at least 3 different progressions
  let selectedTemplates: ProgressionTemplate[];

  if (templates.length >= 3) {
    selectedTemplates = pickMultipleRandom(templates, 3);
  } else {
    // Mix with defaults if not enough
    const allTemplates = [...templates, ...DEFAULT_PROGRESSIONS];
    selectedTemplates = pickMultipleRandom(allTemplates, 3);
  }

  const main = generateProgressionFromTemplate(key, selectedTemplates[0], 'Main', genre);
  const bridges = [
    generateProgressionFromTemplate(key, selectedTemplates[1], 'Bridge 1', genre),
    generateProgressionFromTemplate(key, selectedTemplates[2], 'Bridge 2', genre),
  ];

  return { main, bridges };
}

// Regenerate a single progression
export function regenerateProgression(
  key: Key,
  genre: Genre,
  mood: Mood,
  label: string
): ChordProgression {
  const templates = getTemplates(genre, mood);
  const template = pickRandom(templates);
  return generateProgressionFromTemplate(key, template, label, genre);
}

// Generate a passing chord between two chords
// パッシングコード（経過和音）を生成: 前後のコードを滑らかに繋ぐ
export function generatePassingChord(
  prevChord: Chord,
  nextChord: Chord,
  key: Key,
  genre: Genre
): Chord {
  const prevRootMidi = NOTE_TO_MIDI[prevChord.root];
  const nextRootMidi = NOTE_TO_MIDI[nextChord.root];

  // スケール内のノートを取得
  const scaleNotes = getScaleNotes(key);

  // 前後のルート間の中間音を探す
  const midpoint = Math.round((prevRootMidi + nextRootMidi) / 2);
  const midpointNote = NOTE_NAMES[midpoint % 12];

  // 中間音がスケール内にあるかチェック、なければ最も近いスケール音を使用
  let passingRoot: NoteName = midpointNote;
  if (!scaleNotes.includes(midpointNote)) {
    // 最も近いスケール音を探す
    const distances = scaleNotes.map((note: NoteName) => ({
      note,
      dist: Math.abs(NOTE_TO_MIDI[note] - midpoint)
    }));
    distances.sort((a: { dist: number }, b: { dist: number }) => a.dist - b.dist);
    passingRoot = distances[0].note as NoteName;
  }

  // コードクオリティを決定（前後のコードを参考に）
  // 簡易的なルール: ドミナント系なら7、マイナー系ならmin7、それ以外はmaj7
  let passingQuality: ChordQuality = 'maj7';

  if (prevChord.quality.includes('min') || nextChord.quality.includes('min')) {
    passingQuality = 'min7';
  }
  if (prevChord.quality === '7' || nextChord.quality === '7') {
    passingQuality = '7';
  }

  // Enrichmentを適用
  passingQuality = enrichChord(passingQuality, genre);

  // オープンボイシング判定
  const openVoicingGenres: Genre[] = ['Jazz', 'Neo Soul', 'Lo-Fi'];
  const useOpenVoicing = openVoicingGenres.includes(genre);

  // ボイシング生成（前のコードからスムーズに）
  const notes = getVoicedChordNotes(passingRoot, passingQuality, prevChord.notes, undefined, useOpenVoicing);

  return {
    id: generateId(),
    root: passingRoot,
    quality: passingQuality,
    notes,
    displayName: getChordDisplayName(passingRoot, passingQuality),
    durationBeats: 2, // パッシングコードは2拍
  };
}

// Generate a new chord variation with same root but possibly different quality
// 既存コードのバリエーションを生成（ルートは維持、クオリティやボイシングを変更）
export function generateSingleChord(
  oldChord: Chord,
  prevChord: Chord | null,
  key: Key,
  genre: Genre
): Chord {
  // 候補となるクオリティリスト（ジャンルに応じて）
  const baseQualities: ChordQuality[] = key.scale === 'minor'
    ? ['min7', 'min9', 'min11', 'm7b5', '7', 'dim7']
    : ['maj7', 'maj9', 'maj13', '7', '9', '13', 'min7', 'min9'];

  // 現在のクオリティを除外
  const availableQualities = baseQualities.filter(q => q !== oldChord.quality);

  // ランダムに選択してEnrichmentを適用
  let newQuality = availableQualities[Math.floor(Math.random() * availableQualities.length)] || oldChord.quality;
  newQuality = enrichChord(newQuality, genre);

  // オープンボイシング判定
  const openVoicingGenres: Genre[] = ['Jazz', 'Neo Soul', 'Lo-Fi'];
  const useOpenVoicing = openVoicingGenres.includes(genre);

  // ボイシング生成（前のコードからスムーズに）
  const notes = getVoicedChordNotes(
    oldChord.root,
    newQuality,
    prevChord?.notes || null,
    undefined,
    useOpenVoicing
  );

  return {
    id: Math.random().toString(36).substring(2, 9),
    root: oldChord.root,
    quality: newQuality,
    notes,
    displayName: getChordDisplayName(oldChord.root, newQuality),
    durationBeats: oldChord.durationBeats, // デュレーションは維持
  };
}

// ============================================================
// モーダルインターチェンジ（借用和音）コード生成
// ============================================================

// Generate a modal interchange chord (borrowed from parallel scale)
// モーダルインターチェンジコードを生成（パラレルスケールから借用）
export function generateModalInterchangeChord(
  oldChord: Chord,
  prevChord: Chord | null,
  key: Key,
  genre: Genre
): Chord {
  // 借用可能なコードをランダムに選択
  const borrowed = getRandomBorrowableChord(key);

  // オープンボイシング判定
  const openVoicingGenres: Genre[] = ['Jazz', 'Neo Soul', 'Lo-Fi'];
  const useOpenVoicing = openVoicingGenres.includes(genre);

  // ボイシング生成（前のコードからスムーズに）
  const notes = getVoicedChordNotes(
    borrowed.root,
    borrowed.quality,
    prevChord?.notes || null,
    undefined,
    useOpenVoicing
  );

  return {
    id: Math.random().toString(36).substring(2, 9),
    root: borrowed.root,
    quality: borrowed.quality,
    notes,
    displayName: getChordDisplayName(borrowed.root, borrowed.quality),
    durationBeats: oldChord.durationBeats, // デュレーションは維持
    borrowedFrom: borrowed.borrowedFrom,
    borrowedDegree: borrowed.degree,
  };
}

// 進行を拡張するコードを生成（4ブロック追加）
// Generate extension chords (add 4 more blocks with different progression)
export function generateExtensionChords(
  existingChords: Chord[],
  key: Key,
  genre?: Genre,
  mood?: Mood
): Chord[] {
  // 既存のコード数を確認（最大8ブロックまで）
  if (existingChords.length >= 8) {
    return [];
  }

  const chordsToAdd = Math.min(4, 8 - existingChords.length);
  const lastChord = existingChords[existingChords.length - 1];

  // 展開用のプログレッションテンプレート
  // 最初の4ブロックとは違う流れを作るため、よく使われる展開パターン
  const EXTENSION_TEMPLATES: ProgressionTemplate[] = [
    // サブドミナントからの展開
    [[4, 'maj7'], [5, '7'], [3, 'min7'], [6, 'min7']],
    // リハーモナイズされた展開
    [[2, 'min7'], [5, '9'], [1, 'maj9'], [4, 'maj7']],
    // 転調を示唆する展開
    [[6, 'min7'], [2, 'min7'], [5, '7'], [1, 'maj7']],
    // ドラマチックな展開
    [[4, 'maj7'], [4, 'min7'], [1, 'maj7'], [5, '7']],
    // サスペンス→解決
    [[5, 'sus4'], [5, '7'], [1, 'maj7'], [6, 'min7']],
  ];

  // ジャンルに応じたテンプレートを選択
  let template: ProgressionTemplate;

  // ジャンル+ムードのキーでテンプレートを探す
  const templateKey = `${genre || 'Pop'}_${mood || 'Chill'}`;
  const genreTemplates = PROGRESSION_TEMPLATES[templateKey];

  if (genreTemplates && genreTemplates.length > 0) {
    // 既存のテンプレートと被らないようにランダム選択
    template = genreTemplates[Math.floor(Math.random() * genreTemplates.length)];
  } else {
    // デフォルトの展開テンプレート
    template = EXTENSION_TEMPLATES[Math.floor(Math.random() * EXTENSION_TEMPLATES.length)];
  }

  // オープンボイシングを使用するジャンル
  const openVoicingGenres: Genre[] = ['Jazz', 'Neo Soul', 'Lo-Fi'];
  const useOpenVoicing = Boolean(genre && openVoicingGenres.includes(genre));

  const newChords: Chord[] = [];
  let prevNotes = lastChord?.notes || null;

  for (let i = 0; i < chordsToAdd; i++) {
    const [degree, quality] = template[i % template.length];
    // adjustForMinorKey(degree, quality, key) の正しい呼び出し
    const [adjustedDegree, adjustedQuality] = adjustForMinorKey(degree, quality, key);
    const root = getScaleDegreeNote(key, adjustedDegree);
    let finalQuality = adjustedQuality;

    // ジャンルに応じてクオリティを調整
    // enrichChord(quality, genre) の正しい呼び出し
    if (genre) {
      const enriched = enrichChord(finalQuality, genre);
      finalQuality = enriched;
    }

    const notes = getVoicedChordNotes(root, finalQuality, prevNotes, undefined, useOpenVoicing);

    const chord: Chord = {
      id: generateId(),
      root,
      quality: finalQuality,
      notes,
      displayName: getChordDisplayName(root, finalQuality),
      durationBeats: lastChord?.durationBeats || 4,
    };

    newChords.push(chord);
    prevNotes = notes;
  }

  return newChords;
}
