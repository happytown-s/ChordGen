import type { NoteName, ScaleType, ChordQuality, Key } from '../types';

// Note to MIDI number mapping (octave 4)
export const NOTE_TO_MIDI: Record<NoteName, number> = {
  'C': 60, 'C#': 61, 'D': 62, 'D#': 63, 'E': 64,
  'F': 65, 'F#': 66, 'G': 67, 'G#': 68, 'A': 69,
  'A#': 70, 'B': 71
};

// All note names in order
export const NOTE_NAMES: NoteName[] = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// Scale intervals (semitones from root)
export const SCALE_INTERVALS: Record<ScaleType, number[]> = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10]
};

// Chord intervals (semitones from root)
export const CHORD_INTERVALS: Record<ChordQuality, number[]> = {
  'maj': [0, 4, 7],
  'min': [0, 3, 7],
  'dim': [0, 3, 6],
  'aug': [0, 4, 8],
  'maj7': [0, 4, 7, 11],
  'min7': [0, 3, 7, 10],
  '7': [0, 4, 7, 10],
  'dim7': [0, 3, 6, 9],
  'm7b5': [0, 3, 6, 10],
  'maj9': [0, 4, 7, 11, 14],
  'min9': [0, 3, 7, 10, 14],
  '9': [0, 4, 7, 10, 14],
  'sus2': [0, 2, 7],
  'sus4': [0, 5, 7],
  'add9': [0, 4, 7, 14],
  'maj11': [0, 4, 11, 14, 17],     // R, 3, 7, 9, 11 (5thを省略)
  'min11': [0, 3, 10, 14, 17],     // R, b3, b7, 9, 11 (5thを省略)
  '11': [0, 10, 14, 17],           // R, b7, 9, 11 (3rd/5th省略、sus系サウンド)
  'maj13': [0, 4, 11, 14, 21],     // R, 3, 7, 9, 13 (5thを省略)
  'min13': [0, 3, 10, 14, 21],     // R, b3, b7, 9, 13 (5thを省略)
  '13': [0, 4, 10, 14, 21]         // R, 3, b7, 9, 13 (5thを省略)
};

// Display names for chord qualities
export const CHORD_QUALITY_DISPLAY: Record<ChordQuality, string> = {
  'maj': '',
  'min': 'm',
  'dim': 'dim',
  'aug': 'aug',
  'maj7': 'maj7',
  'min7': 'm7',
  '7': '7',
  'dim7': 'dim7',
  'm7b5': 'm7♭5',
  'maj9': 'maj9',
  'min9': 'm9',
  '9': '9',
  'sus2': 'sus2',
  'sus4': 'sus4',
  'add9': 'add9',
  'maj11': 'maj11',
  'min11': 'm11',
  '11': '11',
  'maj13': 'maj13',
  'min13': 'm13',
  '13': '13'
};

// Get MIDI notes for a chord
export function getChordNotes(root: NoteName, quality: ChordQuality, octave: number = 4): number[] {
  const rootMidi = NOTE_TO_MIDI[root] + (octave - 4) * 12;
  const intervals = CHORD_INTERVALS[quality];
  return intervals.map(interval => rootMidi + interval);
}

// Get display name for a chord
export function getChordDisplayName(root: NoteName, quality: ChordQuality): string {
  return `${root}${CHORD_QUALITY_DISPLAY[quality]}`;
}

// Get scale notes for a key
export function getScaleNotes(key: Key): NoteName[] {
  const rootIndex = NOTE_NAMES.indexOf(key.root);
  const intervals = SCALE_INTERVALS[key.scale];
  return intervals.map(interval => NOTE_NAMES[(rootIndex + interval) % 12]);
}

// Get the note at a specific scale degree (1-indexed)
export function getScaleDegreeNote(key: Key, degree: number): NoteName {
  const scaleNotes = getScaleNotes(key);
  return scaleNotes[(degree - 1) % scaleNotes.length];
}

// Get MIDI note numbers for scale (across 2 octaves for piano roll display)
export function getScaleMidiNotes(key: Key, startOctave: number = 3): number[] {
  const rootMidi = NOTE_TO_MIDI[key.root] + (startOctave - 4) * 12;
  const intervals = SCALE_INTERVALS[key.scale];
  const notes: number[] = [];

  // Two octaves
  for (let oct = 0; oct < 2; oct++) {
    for (const interval of intervals) {
      notes.push(rootMidi + interval + oct * 12);
    }
  }

  return notes;
}

// Check if a MIDI note is in the current scale
export function isNoteInScale(midiNote: number, key: Key): boolean {
  const noteIndex = midiNote % 12;
  const rootIndex = NOTE_NAMES.indexOf(key.root);
  const intervals = SCALE_INTERVALS[key.scale];

  return intervals.some(interval => (rootIndex + interval) % 12 === noteIndex);
}

// Convert MIDI note number to note name
export function midiToNoteName(midiNote: number): NoteName {
  return NOTE_NAMES[midiNote % 12];
}

// Get octave from MIDI note number
export function midiToOctave(midiNote: number): number {
  return Math.floor(midiNote / 12) - 1;
}

// Get chord notes with smooth voice leading from previous chord
export function getVoicedChordNotes(
  root: NoteName,
  quality: ChordQuality,
  previousNotes: number[] | null,
  targetRange: { low: number; high: number } = { low: 48, high: 72 },
  useOpenVoicing: boolean = false // 新規：オープンボイシングのフラグ
): number[] {
  const rootMidi = NOTE_TO_MIDI[root];
  const intervals = CHORD_INTERVALS[quality];

  // オープンボイシングの場合、低音（ベース）を独立させる
  if (useOpenVoicing) {
    // 1. 低音（ベース）を Octave 2-3 に配置
    const bassNote = rootMidi - 12; // Octave 3 (標準 Octave 4 から -1)

    // 2. 上部構造（Upper Structure）を構築
    // 5thを省略した実用的な構成にするため、intervalsをそのまま使う（既に省略済み定義を使用）
    const upperIntervals = intervals.filter(i => i !== 0); // ルート以外の音

    // 上部音の候補を生成
    let upperPossibleNotes: number[][] = upperIntervals.map(interval => {
      const notes: number[] = [];
      for (let octave = 3; octave <= 6; octave++) {
        const note = rootMidi + interval + (octave - 4) * 12;
        if (note >= targetRange.low && note <= targetRange.high + 12) {
          notes.push(note);
        }
      }
      return notes;
    });

    // 直前のコードがある場合はスムーズに連結、ない場合はクローズド
    let upperVoicing: number[];
    if (previousNotes && previousNotes.length > 1) {
      // 以前のコードの上部音（最も低い音＝ベース以外）と比較
      const prevUpper = previousNotes.filter(n => n > 48);
      upperVoicing = getSmoothedVoicing(upperPossibleNotes, prevUpper.length > 0 ? prevUpper : previousNotes);
    } else {
      upperVoicing = getCloseVoicing(upperPossibleNotes, targetRange);
    }

    // 3. Drop-2 変換を適用（4音以上ある場合）
    if (upperVoicing.length >= 3) {
      const sortedUpper = [...upperVoicing].sort((a, b) => a - b);
      // 上から2番目の音を1オクターブ下げる
      const dropIdx = sortedUpper.length - 2;
      sortedUpper[dropIdx] -= 12;
      upperVoicing = sortedUpper;
    }

    return [bassNote, ...upperVoicing].sort((a, b) => a - b);
  }

  // デフォルトのクローズドボイシング生成
  const possibleNotes: number[][] = intervals.map(interval => {
    const notes: number[] = [];
    for (let octave = 2; octave <= 6; octave++) {
      const note = rootMidi + interval + (octave - 4) * 12;
      if (note >= targetRange.low && note <= targetRange.high) {
        notes.push(note);
      }
    }
    return notes;
  });

  if (!previousNotes || previousNotes.length === 0) {
    return getCloseVoicing(possibleNotes, targetRange);
  }

  return getSmoothedVoicing(possibleNotes, previousNotes);
}

// Get close voicing (notes close together)
function getCloseVoicing(
  possibleNotes: number[][],
  targetRange: { low: number; high: number }
): number[] {
  const centerNote = (targetRange.low + targetRange.high) / 2;

  // Pick notes closest to center, keeping them close together
  const result: number[] = [];

  for (let i = 0; i < possibleNotes.length; i++) {
    const options = possibleNotes[i];
    if (options.length === 0) continue;

    if (result.length === 0) {
      // First note: pick closest to center
      const closest = options.reduce((a, b) =>
        Math.abs(a - centerNote) < Math.abs(b - centerNote) ? a : b
      );
      result.push(closest);
    } else {
      // Subsequent notes: pick closest to the average of existing notes
      const avg = result.reduce((a, b) => a + b, 0) / result.length;
      const closest = options.reduce((a, b) =>
        Math.abs(a - avg) < Math.abs(b - avg) ? a : b
      );
      result.push(closest);
    }
  }

  return result.sort((a, b) => a - b);
}

// Get voicing with smooth voice leading
// 「最も近い音」ベースのマッチングで、音数が異なるコード間でも滑らかな連結を実現
function getSmoothedVoicing(possibleNotes: number[][], previousNotes: number[]): number[] {
  const sortedPrev = [...previousNotes].sort((a, b) => a - b);
  const result: number[] = [];
  const usedOptions: Set<number> = new Set();
  const usedPrevNotes: Set<number> = new Set();

  // 各声部について、前のコードの「最も近い未使用の音」を探してマッチング
  for (let i = 0; i < possibleNotes.length; i++) {
    const options = possibleNotes[i].filter(n => !usedOptions.has(n));
    if (options.length === 0) continue;

    // 前のコードで未使用の音の中から、最も近いものを見つける
    let targetPrevNote: number;
    const availablePrevNotes = sortedPrev.filter(n => !usedPrevNotes.has(n));

    if (availablePrevNotes.length > 0) {
      // 未使用の前の音がある場合、中央値に近いものを基準にする
      const centerIdx = Math.floor(availablePrevNotes.length / 2);
      targetPrevNote = availablePrevNotes[Math.min(i, availablePrevNotes.length - 1)] || availablePrevNotes[centerIdx];
    } else {
      // 全て使用済みの場合、前のコード全体の中央値を基準にする
      targetPrevNote = sortedPrev[Math.floor(sortedPrev.length / 2)];
    }

    // 最も移動距離が小さいオプションを選択
    let bestOption = options[0];
    let minMovement = Math.abs(options[0] - targetPrevNote);

    for (const option of options) {
      const movement = Math.abs(option - targetPrevNote);
      if (movement < minMovement) {
        minMovement = movement;
        bestOption = option;
      }
    }

    result.push(bestOption);
    usedOptions.add(bestOption);

    // 使用した前の音に最も近いものをマーク
    if (availablePrevNotes.length > 0) {
      const closestPrev = availablePrevNotes.reduce((a, b) =>
        Math.abs(a - bestOption) < Math.abs(b - bestOption) ? a : b
      );
      usedPrevNotes.add(closestPrev);
    }
  }

  return result.sort((a, b) => a - b);
}

// ============================================================
// モーダルインターチェンジ（借用和音）関連
// ============================================================

// 借用可能なコード定義
// [半音オフセット, クオリティ, 度数表記]
type BorrowableChordDef = [number, ChordQuality, string];

// メジャーキーからマイナーキーへの借用（パラレルマイナー）
// ♭III, ♭VI, ♭VII, iv, ii°
const MAJOR_TO_MINOR_BORROWABLE: BorrowableChordDef[] = [
  [3, 'maj7', '♭III'],    // ♭IIImaj7 (例: Cメジャー→E♭maj7)
  [8, 'maj7', '♭VI'],     // ♭VImaj7 (例: Cメジャー→A♭maj7)
  [10, '7', '♭VII'],      // ♭VII7 (例: Cメジャー→B♭7)
  [5, 'min7', 'iv'],      // ivmin7 (例: Cメジャー→Fmin7)
  [2, 'm7b5', 'ii°'],     // iiø7 (例: Cメジャー→Dm7♭5)
];

// マイナーキーからメジャーキーへの借用（パラレルメジャー）
// IV, V, II
const MINOR_TO_MAJOR_BORROWABLE: BorrowableChordDef[] = [
  [5, 'maj7', 'IV'],      // IVmaj7 (例: Cマイナー→Fmaj7)
  [7, '7', 'V'],          // V7 (例: Cマイナー→G7) ※ハーモニックマイナーからも
  [2, 'min7', 'II'],      // IImin7 (例: Cマイナー→Dmin7)
];

// 借用可能なコード一覧を取得
export function getBorrowableChords(key: Key): { root: NoteName; quality: ChordQuality; degree: string; borrowedFrom: 'parallel-minor' | 'parallel-major' }[] {
  const rootIndex = NOTE_NAMES.indexOf(key.root);
  const borrowableList = key.scale === 'major' ? MAJOR_TO_MINOR_BORROWABLE : MINOR_TO_MAJOR_BORROWABLE;
  const borrowedFrom = key.scale === 'major' ? 'parallel-minor' : 'parallel-major';

  return borrowableList.map(([semitones, quality, degree]) => {
    const chordRootIndex = (rootIndex + semitones) % 12;
    return {
      root: NOTE_NAMES[chordRootIndex],
      quality,
      degree,
      borrowedFrom: borrowedFrom as 'parallel-minor' | 'parallel-major',
    };
  });
}

// ランダムに借用コードを1つ選択
export function getRandomBorrowableChord(key: Key): { root: NoteName; quality: ChordQuality; degree: string; borrowedFrom: 'parallel-minor' | 'parallel-major' } {
  const borrowableChords = getBorrowableChords(key);
  return borrowableChords[Math.floor(Math.random() * borrowableChords.length)];
}

// ダイアトニックコードのクオリティマップ（メジャー/マイナースケール）
// 度数 1-7 に対応するデフォルトのコードクオリティ
const DIATONIC_QUALITIES_MAJOR: ChordQuality[] = ['maj7', 'min7', 'min7', 'maj7', '7', 'min7', 'm7b5'];
const DIATONIC_QUALITIES_MINOR: ChordQuality[] = ['min7', 'm7b5', 'maj7', 'min7', 'min7', 'maj7', '7'];

// 度数をシフトした新しいダイアトニックコードを取得
// direction: 1 = 上へ, -1 = 下へ
export function getShiftedDegreeChord(
  key: Key,
  currentRoot: NoteName,
  direction: 1 | -1
): { root: NoteName; quality: ChordQuality; degree: number } {
  const scaleNotes = getScaleNotes(key);

  // 現在のルート音がスケール上の何度かを特定
  let currentDegreeIndex = scaleNotes.findIndex(note => note === currentRoot);

  // スケール外の場合は最も近い度数を探す
  if (currentDegreeIndex === -1) {
    const rootMidi = NOTE_TO_MIDI[currentRoot];
    let minDistance = Infinity;
    scaleNotes.forEach((note, idx) => {
      const noteMidi = NOTE_TO_MIDI[note];
      const distance = Math.abs((rootMidi - noteMidi + 12) % 12);
      if (distance < minDistance) {
        minDistance = distance;
        currentDegreeIndex = idx;
      }
    });
  }

  // 度数をシフト（0-6の範囲でラップ）
  let newDegreeIndex = (currentDegreeIndex + direction + 7) % 7;

  // 新しいルート音
  const newRoot = scaleNotes[newDegreeIndex];

  // ダイアトニッククオリティを取得
  const qualities = key.scale === 'major' ? DIATONIC_QUALITIES_MAJOR : DIATONIC_QUALITIES_MINOR;
  const newQuality = qualities[newDegreeIndex];

  return {
    root: newRoot,
    quality: newQuality,
    degree: newDegreeIndex + 1, // 1-indexed
  };
}

