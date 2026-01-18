/**
 * コードパターン生成ロジック
 * ベースラインパターンと同様の構造で、コードの演奏パターンを生成
 */

import type { Chord, ChordPattern } from '../types';

// 個別ノートイベント
export interface ChordNote {
    midiNote: number;
    startBeat: number;
    durationBeats: number;
    velocity: number;
}

/**
 * コードをパターンに応じたノートイベントに変換
 */
export function generateChordWithPattern(
    chord: Chord,
    pattern: ChordPattern,
    startBeat: number
): ChordNote[] {
    const notes = [...chord.notes].sort((a, b) => a - b); // 低い音から順にソート
    const duration = chord.durationBeats;

    switch (pattern) {
        case 'sustain':
            return generateSustainPattern(notes, startBeat, duration);
        case 'arpeggio-up':
            return generateArpeggioUpPattern(notes, startBeat, duration);
        case 'arpeggio-down':
            return generateArpeggioDownPattern(notes, startBeat, duration);
        case 'staccato':
            return generateStaccatoPattern(notes, startBeat, duration);
        case 'strum':
            return generateStrumPattern(notes, startBeat, duration);
        default:
            return generateSustainPattern(notes, startBeat, duration);
    }
}

/**
 * サステイン（ホールド）パターン - 現在のデフォルト動作
 * 全ノートを同時に鳴らし、コード全体でホールド
 */
function generateSustainPattern(
    notes: number[],
    startBeat: number,
    duration: number
): ChordNote[] {
    return notes.map(midiNote => ({
        midiNote,
        startBeat,
        durationBeats: duration,
        velocity: 80,
    }));
}

/**
 * アルペジオ上昇パターン
 * 低音から高音へ順番に弾く
 */
function generateArpeggioUpPattern(
    notes: number[],
    startBeat: number,
    duration: number
): ChordNote[] {
    const result: ChordNote[] = [];
    const noteCount = notes.length;
    // 1拍を均等に分割（例: 4ノートなら16分音符ずつ）
    const noteInterval = Math.min(0.25, duration / noteCount); // 最大16分音符
    const noteDuration = noteInterval * 0.9; // 少し短めにして隙間を作る

    // 最後のノートは残りの時間をホールド
    const lastNoteDuration = duration - noteInterval * (noteCount - 1);

    notes.forEach((midiNote, index) => {
        const isLast = index === noteCount - 1;
        result.push({
            midiNote,
            startBeat: startBeat + noteInterval * index,
            durationBeats: isLast ? lastNoteDuration : noteDuration,
            velocity: 75 + index * 3, // 高音になるほど少し大きく
        });
    });

    return result;
}

/**
 * アルペジオ下降パターン
 * 高音から低音へ順番に弾く
 */
function generateArpeggioDownPattern(
    notes: number[],
    startBeat: number,
    duration: number
): ChordNote[] {
    const reversed = [...notes].reverse();
    const result: ChordNote[] = [];
    const noteCount = reversed.length;
    const noteInterval = Math.min(0.25, duration / noteCount);
    const noteDuration = noteInterval * 0.9;
    const lastNoteDuration = duration - noteInterval * (noteCount - 1);

    reversed.forEach((midiNote, index) => {
        const isLast = index === noteCount - 1;
        result.push({
            midiNote,
            startBeat: startBeat + noteInterval * index,
            durationBeats: isLast ? lastNoteDuration : noteDuration,
            velocity: 80 - index * 2, // 低音になるほど少し小さく
        });
    });

    return result;
}

/**
 * スタッカートパターン
 * 短く区切って弾く（8分音符で4回リピート）
 */
function generateStaccatoPattern(
    notes: number[],
    startBeat: number,
    duration: number
): ChordNote[] {
    const result: ChordNote[] = [];
    const hitCount = Math.floor(duration * 2); // 8分音符単位
    const hitInterval = 0.5; // 8分音符
    const hitDuration = 0.15; // 短いノート

    for (let i = 0; i < hitCount; i++) {
        const beatOffset = i * hitInterval;
        if (beatOffset >= duration) break;

        // 偶数拍は強め、奇数拍は弱め
        const velocity = i % 2 === 0 ? 85 : 65;

        notes.forEach(midiNote => {
            result.push({
                midiNote,
                startBeat: startBeat + beatOffset,
                durationBeats: hitDuration,
                velocity,
            });
        });
    }

    return result;
}

/**
 * ストラムパターン
 * ギターのストラム風（微妙なタイミングずれ）
 */
function generateStrumPattern(
    notes: number[],
    startBeat: number,
    duration: number
): ChordNote[] {
    const result: ChordNote[] = [];
    // ストラムの「ずれ」時間（32分音符程度）
    const strumDelay = 0.03;

    notes.forEach((midiNote, index) => {
        const offset = strumDelay * index;
        result.push({
            midiNote,
            startBeat: startBeat + offset,
            durationBeats: duration - offset,
            velocity: 75 + Math.random() * 10, // 少しランダムなベロシティ
        });
    });

    return result;
}

/**
 * プログレッション全体のコードパターンを生成
 */
export function generateProgressionChordNotes(
    chords: Chord[],
    pattern: ChordPattern
): ChordNote[] {
    const result: ChordNote[] = [];
    let currentBeat = 0;

    for (const chord of chords) {
        const chordNotes = generateChordWithPattern(chord, pattern, currentBeat);
        result.push(...chordNotes);
        currentBeat += chord.durationBeats;
    }

    return result;
}
