import { useMemo } from 'react';
import type { Key } from '../types';
import { isNoteInScale, midiToNoteName } from '../utils/musicTheory';

interface PianoRollProps {
  notes: number[];
  keyValue: Key;
  width?: number;
  height?: number;
}

// Piano roll displays 2 octaves (24 keys) starting from C3
const START_NOTE = 48; // C3
const END_NOTE = 72; // C5

// Black key positions in an octave (relative to C)
const BLACK_KEY_POSITIONS = [1, 3, 6, 8, 10]; // C#, D#, F#, G#, A#

function isBlackKey(midiNote: number): boolean {
  return BLACK_KEY_POSITIONS.includes(midiNote % 12);
}

export function PianoRoll({ notes, keyValue, width = 200, height = 60 }: PianoRollProps) {
  const whiteKeyWidth = width / 14; // 14 white keys in 2 octaves
  const blackKeyWidth = whiteKeyWidth * 0.6;
  const blackKeyHeight = height * 0.6;

  // Calculate white key positions
  const { whiteKeys, blackKeys } = useMemo(() => {
    const whiteKeys: { note: number; x: number }[] = [];
    const blackKeys: { note: number; x: number }[] = [];

    let whiteKeyIndex = 0;
    for (let note = START_NOTE; note < END_NOTE; note++) {
      if (isBlackKey(note)) {
        // Position black key between the previous white key
        const x = whiteKeyIndex * whiteKeyWidth - blackKeyWidth / 2;
        blackKeys.push({ note, x });
      } else {
        whiteKeys.push({ note, x: whiteKeyIndex * whiteKeyWidth });
        whiteKeyIndex++;
      }
    }
    return { whiteKeys, blackKeys };
  }, [whiteKeyWidth, blackKeyWidth]);

  return (
    <svg width={width} height={height} className="rounded overflow-hidden">
      {/* Background */}
      <rect x={0} y={0} width={width} height={height} fill="#1e293b" />

      {/* White keys */}
      {whiteKeys.map(({ note, x }) => {
        const isActive = notes.includes(note);
        const inScale = isNoteInScale(note, keyValue);

        let fill = '#f1f5f9'; // default white
        if (isActive) {
          fill = '#3b82f6'; // blue for active
        } else if (inScale) {
          fill = '#e2e8f0'; // slightly highlighted for scale notes
        }

        return (
          <g key={note}>
            <rect
              x={x}
              y={0}
              width={whiteKeyWidth - 1}
              height={height}
              fill={fill}
              stroke="#64748b"
              strokeWidth={0.5}
              rx={2}
            />
            {isActive && (
              <text
                x={x + whiteKeyWidth / 2}
                y={height - 8}
                textAnchor="middle"
                fontSize={8}
                fill="#1e3a8a"
                fontWeight="bold"
              >
                {midiToNoteName(note)}
              </text>
            )}
          </g>
        );
      })}

      {/* Black keys */}
      {blackKeys.map(({ note, x }) => {
        const isActive = notes.includes(note);
        const inScale = isNoteInScale(note, keyValue);

        let fill = '#1e293b'; // default black
        if (isActive) {
          fill = '#2563eb'; // darker blue for active
        } else if (inScale) {
          fill = '#334155'; // slightly highlighted for scale notes
        }

        return (
          <g key={note}>
            <rect
              x={x}
              y={0}
              width={blackKeyWidth}
              height={blackKeyHeight}
              fill={fill}
              stroke="#0f172a"
              strokeWidth={0.5}
              rx={1}
            />
            {isActive && (
              <text
                x={x + blackKeyWidth / 2}
                y={blackKeyHeight - 6}
                textAnchor="middle"
                fontSize={7}
                fill="#93c5fd"
                fontWeight="bold"
              >
                {midiToNoteName(note)}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
