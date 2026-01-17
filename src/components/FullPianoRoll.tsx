// 統合ピアノロール画面
// コードとベースラインを同時に表示し、パートごとにミュート可能

import { useState, useRef, useEffect } from 'react';
import type { Chord, BasslinePattern } from '../types';
import { generateProgressionBassline } from '../utils/basslineGenerator';
import { playBassline, playProgression } from '../utils/audioEngine';
import type { SoundType } from '../utils/audioEngine';

// ノート名変換
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
function midiToNoteName(midi: number): string {
    const octave = Math.floor(midi / 12) - 1;
    const note = NOTE_NAMES[midi % 12];
    return `${note}${octave}`;
}

interface FullPianoRollProps {
    chords: Chord[];
    basslinePattern: BasslinePattern;
    tempo: number;
    soundType: SoundType;
    onMuteChange?: (chordsMuted: boolean, bassMuted: boolean) => void;
}

export function FullPianoRoll({
    chords,
    basslinePattern,
    tempo,
    soundType,
    onMuteChange
}: FullPianoRollProps) {
    const [chordsMuted, setChordsMuted] = useState(false);
    const [bassMuted, setBassMuted] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentBeat, setCurrentBeat] = useState<number | null>(null);
    const stopRefs = useRef<{ chord?: () => void; bass?: () => void }>({});
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // ベースラインノートを生成
    const bassNotes = basslinePattern !== 'none'
        ? generateProgressionBassline(chords, basslinePattern)
        : [];

    // トータル拍数を計算
    const totalBeats = chords.reduce((acc, c) => acc + c.durationBeats, 0);

    // ミュート状態変更時にコールバック
    useEffect(() => {
        onMuteChange?.(chordsMuted, bassMuted);
    }, [chordsMuted, bassMuted, onMuteChange]);

    // ピアノロールを描画
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const width = canvas.width;
        const height = canvas.height;

        // 背景
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(0, 0, width, height);

        // MIDIノート範囲を計算
        let minNote = 127, maxNote = 0;
        chords.forEach(c => {
            c.notes.forEach(n => {
                minNote = Math.min(minNote, n);
                maxNote = Math.max(maxNote, n);
            });
        });
        bassNotes.forEach(n => {
            minNote = Math.min(minNote, n.midiNote);
            maxNote = Math.max(maxNote, n.midiNote);
        });

        // パディングを追加
        minNote = Math.max(0, minNote - 2);
        maxNote = Math.min(127, maxNote + 2);
        const noteRange = maxNote - minNote + 1;

        // キーボードラベル（左側）
        const keyboardWidth = 40;
        const rollWidth = width - keyboardWidth;
        const noteHeight = Math.max(6, height / noteRange);

        // グリッドとキーボード背景
        ctx.fillStyle = '#334155';
        ctx.fillRect(0, 0, keyboardWidth, height);

        // ノートラベルを描画
        ctx.font = '9px monospace';
        ctx.textAlign = 'right';
        for (let note = minNote; note <= maxNote; note++) {
            const y = height - ((note - minNote + 0.5) * noteHeight);
            const noteName = midiToNoteName(note);
            const isBlackKey = noteName.includes('#');

            // 黒鍵の背景
            if (isBlackKey) {
                ctx.fillStyle = '#1e293b';
                ctx.fillRect(keyboardWidth, y - noteHeight / 2, rollWidth, noteHeight);
            }

            // ラベル
            ctx.fillStyle = isBlackKey ? '#94a3b8' : '#e2e8f0';
            ctx.fillText(noteName, keyboardWidth - 4, y + 3);
        }

        // ビートグリッド
        const beatWidth = rollWidth / totalBeats;
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 1;
        for (let beat = 0; beat <= totalBeats; beat++) {
            const x = keyboardWidth + beat * beatWidth;
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();
        }

        // 小節線（4拍ごと）
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 2;
        for (let beat = 0; beat <= totalBeats; beat += 4) {
            const x = keyboardWidth + beat * beatWidth;
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();
        }

        // コードノートを描画（ミュート時はグレーアウト）
        {
            let currentBeatPos = 0;
            chords.forEach(chord => {
                const x = keyboardWidth + currentBeatPos * beatWidth;
                const w = chord.durationBeats * beatWidth - 2;

                chord.notes.forEach(note => {
                    const y = height - ((note - minNote + 1) * noteHeight);

                    // コードノート（ミュート時はグレー、通常時は青）
                    ctx.fillStyle = chordsMuted ? '#475569' : '#3b82f6';
                    ctx.fillRect(x + 1, y, w, noteHeight - 1);

                    // ハイライト
                    ctx.fillStyle = chordsMuted ? '#64748b' : '#60a5fa';
                    ctx.fillRect(x + 1, y, w, 2);
                });
                currentBeatPos += chord.durationBeats;
            });
        }

        // ベースノートを描画（ミュート時はグレーアウト）
        if (bassNotes.length > 0) {
            bassNotes.forEach(note => {
                const x = keyboardWidth + note.startBeat * beatWidth;
                const w = note.durationBeats * beatWidth - 2;
                const y = height - ((note.midiNote - minNote + 1) * noteHeight);

                // ベースノート（ミュート時はグレー、通常時は緑）
                ctx.fillStyle = bassMuted ? '#475569' : '#22c55e';
                ctx.fillRect(x + 1, y, w, noteHeight - 1);

                // ハイライト
                ctx.fillStyle = bassMuted ? '#64748b' : '#4ade80';
                ctx.fillRect(x + 1, y, w, 2);
            });
        }

        // 再生位置インジケーター
        if (currentBeat !== null) {
            const x = keyboardWidth + currentBeat * beatWidth;
            ctx.strokeStyle = '#f97316';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();
        }

    }, [chords, bassNotes, chordsMuted, bassMuted, totalBeats, currentBeat]);

    // 再生ハンドラ
    const handlePlay = () => {
        if (isPlaying) {
            // 停止
            stopRefs.current.chord?.();
            stopRefs.current.bass?.();
            setIsPlaying(false);
            setCurrentBeat(null);
        } else {
            // 再生
            setIsPlaying(true);
            setCurrentBeat(0);

            // 再生位置更新用
            const startTime = performance.now();
            const msPerBeat = 60000 / tempo;

            const updatePlayhead = () => {
                const elapsed = performance.now() - startTime;
                const beat = elapsed / msPerBeat;
                if (beat < totalBeats) {
                    setCurrentBeat(beat);
                    requestAnimationFrame(updatePlayhead);
                } else {
                    setIsPlaying(false);
                    setCurrentBeat(null);
                }
            };
            requestAnimationFrame(updatePlayhead);

            // コード再生
            if (!chordsMuted && chords.length > 0) {
                const progression = { id: 'temp', label: 'temp', chords };
                const { stop } = playProgression(progression, tempo, soundType);
                stopRefs.current.chord = stop;
            }

            // ベース再生
            if (!bassMuted && bassNotes.length > 0) {
                const { stop } = playBassline(bassNotes, tempo);
                stopRefs.current.bass = stop;
            }
        }
    };

    return (
        <div className="mt-4 p-4 bg-slate-800/80 rounded-lg border border-slate-600">
            {/* ヘッダー */}
            <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium text-slate-300">🎹 Piano Roll</h4>

                <div className="flex items-center gap-3">
                    {/* ミュートボタン */}
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setChordsMuted(!chordsMuted)}
                            className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${chordsMuted
                                ? 'bg-slate-600 text-slate-400 line-through'
                                : 'bg-blue-600 text-white'
                                }`}
                        >
                            🎹 Chords
                        </button>
                        <button
                            onClick={() => setBassMuted(!bassMuted)}
                            disabled={basslinePattern === 'none'}
                            className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${bassMuted || basslinePattern === 'none'
                                ? 'bg-slate-600 text-slate-400 line-through'
                                : 'bg-green-600 text-white'
                                }`}
                        >
                            🎸 Bass
                        </button>
                    </div>

                    {/* 再生ボタン */}
                    <button
                        onClick={handlePlay}
                        className={`flex items-center gap-1.5 px-3 py-1 rounded text-sm transition-colors ${isPlaying
                            ? 'bg-red-600 hover:bg-red-500 text-white'
                            : 'bg-green-600 hover:bg-green-500 text-white'
                            }`}
                    >
                        {isPlaying ? (
                            <>
                                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M5.5 4A1.5 1.5 0 004 5.5v9A1.5 1.5 0 005.5 16h9a1.5 1.5 0 001.5-1.5v-9A1.5 1.5 0 0014.5 4h-9z" clipRule="evenodd" />
                                </svg>
                                Stop
                            </>
                        ) : (
                            <>
                                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M6.3 2.841A1.5 1.5 0 004 4.11v11.78a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                                </svg>
                                Play All
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* キャンバス */}
            <canvas
                ref={canvasRef}
                width={600}
                height={150}
                className="w-full rounded border border-slate-700"
            />

            {/* 凡例 */}
            <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
                <span className="flex items-center gap-1">
                    <span className="w-3 h-3 bg-blue-500 rounded"></span> Chords
                </span>
                <span className="flex items-center gap-1">
                    <span className="w-3 h-3 bg-green-500 rounded"></span> Bass
                </span>
                {(chordsMuted || bassMuted) && (
                    <span className="text-orange-400">
                        ※ ミュート中のパートはMIDI出力から除外されます
                    </span>
                )}
            </div>
        </div>
    );
}
