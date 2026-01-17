// ベースライン生成ロジック
// コード進行に基づいて様々なパターンのベースラインを生成

import type { Chord, BasslinePattern } from '../types';

// ベースラインノート情報
export interface BassNote {
    midiNote: number;     // MIDIノート番号
    startBeat: number;    // 開始位置（拍単位、0から）
    durationBeats: number; // 長さ（拍単位）
    velocity: number;     // ベロシティ
}

// コードのルート音からMIDIノート番号を取得（ベース音域: C2-C3付近）
const NOTE_TO_MIDI: Record<string, number> = {
    'C': 36, 'C#': 37, 'D': 38, 'D#': 39, 'E': 40, 'F': 41,
    'F#': 42, 'G': 43, 'G#': 44, 'A': 45, 'A#': 46, 'B': 47,
};

// コードクオリティから3度と5度のインターバルを取得
function getChordIntervals(quality: string): { third: number; fifth: number } {
    // マイナー系
    if (quality.includes('min') || quality.includes('m7') || quality === 'dim7' || quality === 'm7b5') {
        const fifth = quality.includes('b5') || quality === 'dim7' ? 6 : 7; // 減5度 or 完全5度
        return { third: 3, fifth };
    }
    // メジャー系
    return { third: 4, fifth: 7 };
}

// ルート音のMIDIノート番号を取得
function getRootMidi(chord: Chord): number {
    return NOTE_TO_MIDI[chord.root] || 36;
}

// パターン別のベースライン生成
export function generateBassline(
    chord: Chord,
    pattern: BasslinePattern,
    startBeat: number = 0
): BassNote[] {
    if (pattern === 'none') return [];

    const rootMidi = getRootMidi(chord);
    const { third, fifth } = getChordIntervals(chord.quality);
    const duration = chord.durationBeats;
    const velocity = 90;

    switch (pattern) {
        case 'root-only':
            // ルート音のみ（全音符）
            return [{
                midiNote: rootMidi,
                startBeat,
                durationBeats: duration,
                velocity,
            }];

        case 'root-fifth':
            // ルートと5度（各半分の長さ）
            return [
                {
                    midiNote: rootMidi,
                    startBeat,
                    durationBeats: duration / 2,
                    velocity,
                },
                {
                    midiNote: rootMidi + fifth,
                    startBeat: startBeat + duration / 2,
                    durationBeats: duration / 2,
                    velocity: velocity - 10,
                },
            ];

        case 'walking':
            // ウォーキングベース（4分音符で移動）
            // Root → 3rd → 5th → Approach（次のルートの半音下or上）
            if (duration >= 4) {
                const beatDuration = duration / 4;
                return [
                    { midiNote: rootMidi, startBeat, durationBeats: beatDuration, velocity },
                    { midiNote: rootMidi + third, startBeat: startBeat + beatDuration, durationBeats: beatDuration, velocity: velocity - 5 },
                    { midiNote: rootMidi + fifth, startBeat: startBeat + beatDuration * 2, durationBeats: beatDuration, velocity: velocity - 5 },
                    { midiNote: rootMidi + fifth + 2, startBeat: startBeat + beatDuration * 3, durationBeats: beatDuration, velocity: velocity - 10 }, // アプローチノート
                ];
            } else if (duration >= 2) {
                // 2拍の場合は2音
                return [
                    { midiNote: rootMidi, startBeat, durationBeats: duration / 2, velocity },
                    { midiNote: rootMidi + fifth, startBeat: startBeat + duration / 2, durationBeats: duration / 2, velocity: velocity - 5 },
                ];
            } else {
                return [{ midiNote: rootMidi, startBeat, durationBeats: duration, velocity }];
            }

        case 'syncopated':
            // シンコペーション（8分音符ベース、オフビート強調）
            if (duration >= 2) {
                const eighth = 0.5;
                const notes: BassNote[] = [];
                let currentBeat = startBeat;

                // パターン: 休 - 音 - 休 - 音 - (繰り返し)
                for (let i = 0; i < Math.floor(duration / 1); i++) {
                    notes.push({
                        midiNote: i % 2 === 0 ? rootMidi : rootMidi + fifth,
                        startBeat: currentBeat + eighth, // オフビート
                        durationBeats: eighth,
                        velocity: velocity - (i % 2 === 0 ? 0 : 10),
                    });
                    currentBeat += 1;
                }
                return notes;
            } else {
                return [{ midiNote: rootMidi, startBeat: startBeat + 0.5, durationBeats: 0.5, velocity }];
            }

        case 'octave':
            // オクターブバウンス（8分音符でルートとオクターブ上を交互）
            if (duration >= 1) {
                const eighth = 0.5;
                const notes: BassNote[] = [];
                const numNotes = Math.floor(duration / eighth);

                for (let i = 0; i < numNotes; i++) {
                    notes.push({
                        midiNote: i % 2 === 0 ? rootMidi : rootMidi + 12, // オクターブ上
                        startBeat: startBeat + i * eighth,
                        durationBeats: eighth,
                        velocity: i % 2 === 0 ? velocity : velocity - 15,
                    });
                }
                return notes;
            } else {
                return [{ midiNote: rootMidi, startBeat, durationBeats: duration, velocity }];
            }

        default:
            return [];
    }
}

// 進行全体のベースラインを生成
export function generateProgressionBassline(
    chords: Chord[],
    pattern: BasslinePattern
): BassNote[] {
    if (pattern === 'none') return [];

    const allNotes: BassNote[] = [];
    let currentBeat = 0;

    for (const chord of chords) {
        const notes = generateBassline(chord, pattern, currentBeat);
        allNotes.push(...notes);
        currentBeat += chord.durationBeats;
    }

    return allNotes;
}
