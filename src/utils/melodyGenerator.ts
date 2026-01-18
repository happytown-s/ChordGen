import type { Chord, Key, MelodyPattern } from '../types';
import { getChordNotes, getScaleNotes, midiToNoteName } from './musicTheory';

// メロディノート情報
export interface MelodyNote {
    midiNote: number;     // MIDIノート番号
    startBeat: number;    // 開始位置（拍単位、0から）
    durationBeats: number; // 長さ（拍単位）
    velocity: number;     // ベロシティ
}

// ターゲットのオクターブ範囲 (C4 - C6)
const MELODY_MIN_NOTE = 60; // C4
const MELODY_MAX_NOTE = 84; // C6

// MIDIノート番号がスケール内にあるかチェック
function isNoteInScale(midiNote: number, key: Key): boolean {
    const noteName = midiToNoteName(midiNote);
    const scaleNotes = getScaleNotes(key);
    return scaleNotes.includes(noteName);
}

// 指定範囲内でスケールノートに最も近い音を探す
function snapToScale(midiNote: number, key: Key): number {
    if (isNoteInScale(midiNote, key)) return midiNote;

    // 上下1半音ずつ探索
    for (let i = 1; i <= 2; i++) {
        if (isNoteInScale(midiNote + i, key)) return midiNote + i;
        if (isNoteInScale(midiNote - i, key)) return midiNote - i;
    }
    return midiNote; // 見つからない場合はそのまま（通常ありえないが）
}

// コードトーンの中からランダムに1つ選択（指定オクターブ範囲内）
function getRandomChordTone(chord: Chord, min: number = MELODY_MIN_NOTE, max: number = MELODY_MAX_NOTE): number {
    // コードの構成音を取得
    const baseNotes = getChordNotes(chord.root, chord.quality); // デフォルト octave 4
    const toneClasses = baseNotes.map(n => n % 12); // ピッチクラス (0-11)

    // 範囲内の候補音を列挙
    const candidates: number[] = [];
    for (let note = min; note <= max; note++) {
        if (toneClasses.includes(note % 12)) {
            candidates.push(note);
        }
    }

    if (candidates.length === 0) return 60; // フォールバック
    return candidates[Math.floor(Math.random() * candidates.length)];
}

// スケール内の音からランダムに選択
function getRandomScaleTone(key: Key, min: number = MELODY_MIN_NOTE, max: number = MELODY_MAX_NOTE): number {
    const candidates: number[] = [];
    for (let note = min; note <= max; note++) {
        if (isNoteInScale(note, key)) {
            candidates.push(note);
        }
    }
    if (candidates.length === 0) return 60;
    return candidates[Math.floor(Math.random() * candidates.length)];
}

// パターン別のメロディ生成
export function generateMelody(
    chord: Chord,
    key: Key,
    pattern: MelodyPattern,
    startBeat: number = 0
): MelodyNote[] {
    if (pattern === 'none') return [];

    const notes: MelodyNote[] = [];
    const duration = chord.durationBeats;

    // シード値を擬似的に固定したいが、簡易的にMath.randomを使用
    // 本格実装ではシード付き乱数が望ましい

    switch (pattern) {
        case 'simple':
            // 2分音符や4分音符を中心としたシンプルなメロディ
            // コードトーンを重視
            {
                let currentBeat = 0;
                while (currentBeat < duration) {
                    // 音符の長さを決定 (1拍, 2拍, または残り全て)
                    const remaining = duration - currentBeat;
                    let noteDur = 1;
                    if (remaining >= 2 && Math.random() > 0.5) noteDur = 2;
                    else if (remaining >= 1) noteDur = 1;
                    else noteDur = remaining;

                    // 音程決定: 80% コードトーン, 20% スケールトーン
                    const noteMidi = Math.random() < 0.8
                        ? getRandomChordTone(chord)
                        : getRandomScaleTone(key);

                    notes.push({
                        midiNote: noteMidi,
                        startBeat: startBeat + currentBeat,
                        durationBeats: noteDur,
                        velocity: 90 + Math.floor(Math.random() * 10)
                    });

                    currentBeat += noteDur;
                }
            }
            break;

        case 'smooth':
            // 8分音符主体で、スケールを順次進行するような滑らかなライン
            {
                let currentBeat = 0;
                let lastNote = getRandomChordTone(chord); // 開始音はコードトーン

                while (currentBeat < duration) {
                    // 長さ: 0.5 (8分) か 1 (4分)
                    const remaining = duration - currentBeat;
                    const noteDur = (remaining >= 1 && Math.random() > 0.7) ? 1 : 0.5;

                    // 次の音: 直前の音の近く（スケール上で±1〜2度）
                    // 4分音符の頭など、拍の頭はコードトーンに寄せるとより音楽的になるが、
                    // ここではシンプルに「近くのスケール音」を選ぶ
                    const interval = Math.floor(Math.random() * 5) - 2; // -2, -1, 0, 1, 2
                    let nextNote = lastNote + interval;

                    // スケール外なら補正
                    nextNote = snapToScale(nextNote, key);

                    // 範囲外チェック
                    if (nextNote < MELODY_MIN_NOTE) nextNote += 12;
                    if (nextNote > MELODY_MAX_NOTE) nextNote -= 12;

                    notes.push({
                        midiNote: nextNote,
                        startBeat: startBeat + currentBeat,
                        durationBeats: noteDur,
                        velocity: 85 + Math.floor(Math.random() * 15)
                    });

                    lastNote = nextNote;
                    currentBeat += noteDur;
                }
            }
            break;

        case 'rhythmic':
            // シンコペーションを含むリズミカルなパターン（モチーフ繰り返し風）
            {
                // 1小節分のリズムパターンを定義 (長さ配列)
                // 例: 付点8分 + 16分 + 8分 + 8分 + 4分 = 0.75 + 0.25 + 0.5 + 0.5 + 1 = 3拍... 複雑なのでシンプルに
                // [1, 0.5, 0.5, 1, 1] (4拍)

                // 簡易的な長さをランダム生成して埋める
                let currentBeat = 0;
                while (currentBeat < duration) {
                    const beatTypes = [0.5, 0.5, 1, 1.5]; // 1.5は付点4分
                    const type = beatTypes[Math.floor(Math.random() * beatTypes.length)];

                    // 残り時間の枠内に収める
                    let noteDur = type;
                    if (currentBeat + noteDur > duration) {
                        noteDur = duration - currentBeat;
                    }

                    // 休符を入れる確率 (10%)
                    const isRest = Math.random() < 0.1;

                    if (!isRest && noteDur > 0) {
                        // 音程: 直前の小節等のコンテキストがないのでランダムだが、
                        // リズミカルなときは反復が効果的
                        const noteMidi = getRandomScaleTone(key);

                        notes.push({
                            midiNote: noteMidi,
                            startBeat: startBeat + currentBeat,
                            durationBeats: noteDur,
                            velocity: 95
                        });
                    }

                    currentBeat += noteDur;
                    if (noteDur <= 0) break; // ガード
                }
            }
            break;
    }

    return notes;
}

// 進行全体のメロディを生成
export function generateProgressionMelody(
    chords: Chord[],
    key: Key,
    pattern: MelodyPattern
): MelodyNote[] {
    if (pattern === 'none') return [];

    const allNotes: MelodyNote[] = [];
    let currentBeat = 0;

    // コンテキストを保持した生成（前の音など）はこの関数レベルで管理するとより良いが、
    // 現状はコードごとに独立生成する簡易実装とする
    // ※ smooth パターンなどでの連結を良くするには、generateMelodyにprevNoteを渡す拡張が考えられる

    for (const chord of chords) {
        const notes = generateMelody(chord, key, pattern, currentBeat);
        allNotes.push(...notes);
        currentBeat += chord.durationBeats;
    }

    return allNotes;
}
