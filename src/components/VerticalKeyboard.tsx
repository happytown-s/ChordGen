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
        // Y座標は均等割り（譜面と合わせるため）
        const y = height - ((note - minNote + 1) * noteHeight);

        if (isBlackKey(note)) {
            // 黒鍵は中央に配置されるので位置はそのままでOK
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

                // 白鍵の描画範囲を拡張して、隣接する黒鍵の食い込みを表現する
                let topY = y;          // 上端（音が高い方、SVG座標は小さい）
                let bottomY = y + noteHeight; // 下端（音が低い方、SVG座標は大きい）

                // 1. 上（音が高い方）が黒鍵なら、その半分まで伸ばす
                const nextNote = note + 1;
                if (nextNote <= maxNote && isBlackKey(nextNote)) {
                    topY -= (noteHeight / 2);
                }

                // 2. 下（音が低い方）が黒鍵なら、その半分まで伸ばす
                const prevNote = note - 1;
                if (prevNote >= minNote && isBlackKey(prevNote)) {
                    bottomY += (noteHeight / 2);
                }

                // 補正後の矩形
                const rectY = topY;
                const rectHeight = bottomY - topY;

                return (
                    <g key={note}>
                        <rect
                            x={0}
                            y={rectY}
                            width={keyboardWidth - 1}
                            height={rectHeight}
                            fill="#f1f5f9"
                            stroke="#94a3b8"
                            strokeWidth={0.5}
                        />
                        {isC && noteHeight >= 8 && (
                            <text
                                x={3}
                                y={y + noteHeight - 2} // ラベル位置は元のマスの下寄せ
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
                    y={y} // 黒鍵は行の中に収まる（または少し細くする？）
                    width={blackKeyLength}
                    height={noteHeight} // 黒鍵の高さは1行分
                    fill="#1e293b"
                    stroke="#0f172a"
                    strokeWidth={0.5}
                    rx={1}
                />
            ))}
        </svg>
    );
}
