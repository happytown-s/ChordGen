// 縦向きピアノ鍵盤コンポーネント（SVGベース）
// FullPianoRollで使用する左側の鍵盤表示

import type { Key } from '../types';

interface VerticalKeyboardProps {
    minNote: number;
    maxNote: number;
    height: number;
    keyValue?: Key;
}

// 黒鍵の位置（オクターブ内）
const BLACK_KEY_POSITIONS = [1, 3, 6, 8, 10]; // C#, D#, F#, G#, A#

function isBlackKey(midiNote: number): boolean {
    return BLACK_KEY_POSITIONS.includes(midiNote % 12);
}

export function VerticalKeyboard({ minNote, maxNote, height }: VerticalKeyboardProps) {
    const noteRange = maxNote - minNote + 1;
    const noteHeight = height / noteRange;
    const keyboardWidth = 45;
    const blackKeyLength = keyboardWidth * 0.65;

    // 白鍵と黒鍵を分けて配列化
    const whiteKeys: { note: number; y: number }[] = [];
    const blackKeys: { note: number; y: number }[] = [];

    for (let note = minNote; note <= maxNote; note++) {
        const y = height - ((note - minNote + 1) * noteHeight);
        if (isBlackKey(note)) {
            blackKeys.push({ note, y });
        } else {
            whiteKeys.push({ note, y });
        }
    }

    return (
        <svg width={keyboardWidth} height={height} className="flex-shrink-0">
            {/* 白鍵 */}
            {whiteKeys.map(({ note, y }) => {
                const isC = note % 12 === 0;
                const octave = Math.floor(note / 12) - 1;

                return (
                    <g key={note}>
                        <rect
                            x={0}
                            y={y}
                            width={keyboardWidth - 1}
                            height={noteHeight}
                            fill="#f1f5f9"
                            stroke="#94a3b8"
                            strokeWidth={0.5}
                        />
                        {isC && noteHeight >= 8 && (
                            <text
                                x={3}
                                y={y + noteHeight - 2}
                                fontSize={Math.min(noteHeight - 2, 10)}
                                fill="#475569"
                                fontWeight="bold"
                            >
                                C{octave}
                            </text>
                        )}
                    </g>
                );
            })}

            {/* 黒鍵（上から描画して白鍵に重ねる） */}
            {blackKeys.map(({ note, y }) => (
                <rect
                    key={note}
                    x={0}
                    y={y}
                    width={blackKeyLength}
                    height={noteHeight}
                    fill="#1e293b"
                    stroke="#0f172a"
                    strokeWidth={0.5}
                    rx={1}
                />
            ))}
        </svg>
    );
}
