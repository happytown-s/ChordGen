// ベースラインプレビューパネル
// 選択されたベースラインパターンを視覚化し、プレビュー再生できる

import { useState, useRef } from 'react';
import type { BasslinePattern, Chord } from '../types';
import { generateProgressionBassline } from '../utils/basslineGenerator';
import { playBassline } from '../utils/audioEngine';

// MIDIノート番号をノート名に変換
function midiToNoteName(midi: number): string {
    const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const octave = Math.floor(midi / 12) - 1;
    const note = notes[midi % 12];
    return `${note}${octave}`;
}

interface BasslinePreviewProps {
    chords: Chord[];
    tempo: number;
    pattern: BasslinePattern;
}

export function BasslinePreview({ chords, tempo, pattern }: BasslinePreviewProps) {
    const [isPlaying, setIsPlaying] = useState(false);
    const [playingIndex, setPlayingIndex] = useState<number | null>(null);
    const stopRef = useRef<(() => void) | null>(null);

    // ベースラインのノートを生成
    const bassNotes = pattern !== 'none' ? generateProgressionBassline(chords, pattern) : [];

    // 再生ハンドラ
    const handlePlay = () => {
        if (isPlaying) {
            // 停止
            if (stopRef.current) {
                stopRef.current();
                stopRef.current = null;
            }
            setIsPlaying(false);
            setPlayingIndex(null);
        } else {
            // 再生
            setIsPlaying(true);
            const { stop } = playBassline(bassNotes, tempo, (idx) => {
                setPlayingIndex(idx);
            });
            stopRef.current = stop;

            // 再生終了の検出
            const totalDuration = bassNotes.reduce((acc, n) =>
                Math.max(acc, n.startBeat + n.durationBeats), 0
            );
            const durationMs = (totalDuration * 60 / tempo) * 1000 + 200;

            setTimeout(() => {
                setIsPlaying(false);
                setPlayingIndex(null);
                stopRef.current = null;
            }, durationMs);
        }
    };

    if (pattern === 'none' || bassNotes.length === 0) {
        return null;
    }

    // ビジュアライズ用の計算
    const totalBeats = bassNotes.reduce((acc, n) =>
        Math.max(acc, n.startBeat + n.durationBeats), 0
    );

    return (
        <div className="mt-4 p-3 bg-slate-800/60 rounded-lg border border-slate-600">
            {/* ヘッダー */}
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-300">🎸 Bassline Preview</span>
                    <span className="text-xs text-slate-500">
                        ({pattern === 'root-only' ? 'Root' :
                            pattern === 'root-fifth' ? 'Root+5th' :
                                pattern === 'walking' ? 'Walking' :
                                    pattern === 'syncopated' ? 'Syncopated' :
                                        'Octave'})
                    </span>
                </div>
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
                            Play Bass
                        </>
                    )}
                </button>
            </div>

            {/* ノート表示 */}
            <div className="flex gap-1 overflow-x-auto pb-1">
                {bassNotes.map((note, index) => {
                    const widthPercent = (note.durationBeats / totalBeats) * 100;
                    const isActive = playingIndex === index;

                    return (
                        <div
                            key={index}
                            className={`flex-shrink-0 px-2 py-1 rounded text-xs font-mono transition-colors ${isActive
                                ? 'bg-green-600 text-white'
                                : 'bg-slate-700 text-slate-300'
                                }`}
                            style={{ minWidth: `${Math.max(widthPercent * 3, 40)}px` }}
                            title={`Beat: ${note.startBeat.toFixed(1)} | Duration: ${note.durationBeats.toFixed(2)}`}
                        >
                            {midiToNoteName(note.midiNote)}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
