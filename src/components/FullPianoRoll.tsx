// 統合ピアノロール画面
// コードとベースラインを同時に表示し、パートごとにミュート可能

import { useState, useRef, useEffect, useMemo } from 'react';
import type { Chord, BasslinePattern } from '../types';
import { generateProgressionBassline } from '../utils/basslineGenerator';
import { playBassline, playProgression } from '../utils/audioEngine';
import type { SoundType } from '../utils/audioEngine';
import { VerticalKeyboard } from './VerticalKeyboard';

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

    // MIDIノート範囲を計算
    const { minNote, maxNote } = useMemo(() => {
        let min = 127, max = 0;
        chords.forEach(c => {
            c.notes.forEach(n => {
                min = Math.min(min, n);
                max = Math.max(max, n);
            });
        });
        bassNotes.forEach(n => {
            min = Math.min(min, n.midiNote);
            max = Math.max(max, n.midiNote);
        });
        // パディングを追加
        return {
            minNote: Math.max(0, min - 2),
            maxNote: Math.min(127, max + 2),
        };
    }, [chords, bassNotes]);

    // ミュート状態変更時にコールバック
    useEffect(() => {
        onMuteChange?.(chordsMuted, bassMuted);
    }, [chordsMuted, bassMuted, onMuteChange]);

    // ピアノロールを描画（ノートブロックのみ、鍵盤はSVGで表示）
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const width = canvas.width;
        const height = canvas.height;
        const noteRange = maxNote - minNote + 1;
        const noteHeight = Math.max(6, height / noteRange);

        // 背景（行ごとに色分け）
        for (let note = minNote; note <= maxNote; note++) {
            const y = height - ((note - minNote + 1) * noteHeight);
            const noteIndex = note % 12;
            const isBlackKey = [1, 3, 6, 8, 10].includes(noteIndex);
            const isC = noteIndex === 0;

            // 背景色（黒鍵行は暗め）
            ctx.fillStyle = isBlackKey ? '#1e293b' : '#2d3a4f';
            ctx.fillRect(0, y, width, noteHeight);

            // C音の行に薄い線を追加（オクターブ境界）
            if (isC) {
                ctx.strokeStyle = '#475569';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(0, y + noteHeight);
                ctx.lineTo(width, y + noteHeight);
                ctx.stroke();
            }
        }

        // ビートグリッド
        const beatWidth = width / totalBeats;
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 1;
        for (let beat = 0; beat <= totalBeats; beat++) {
            const x = beat * beatWidth;
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();
        }

        // 小節線（4拍ごと）
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 2;
        for (let beat = 0; beat <= totalBeats; beat += 4) {
            const x = beat * beatWidth;
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();
        }

        // コードノートを描画（ミュート時はグレーアウト）
        {
            let currentBeatPos = 0;
            chords.forEach(chord => {
                const x = currentBeatPos * beatWidth;
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
                const x = note.startBeat * beatWidth;
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
            const x = currentBeat * beatWidth;
            ctx.strokeStyle = '#f97316';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();
        }

    }, [chords, bassNotes, chordsMuted, bassMuted, totalBeats, currentBeat, minNote, maxNote]);

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

            {/* ピアノロール（鍵盤 + キャンバス） */}
            <div className="flex rounded border border-slate-700 overflow-hidden" style={{ height: '200px' }}>
                {/* SVG鍵盤 */}
                <VerticalKeyboard
                    minNote={minNote}
                    maxNote={maxNote}
                    height={200}
                />
                {/* キャンバス */}
                <canvas
                    ref={canvasRef}
                    width={555}
                    height={200}
                    className="flex-1"
                />
            </div>

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
