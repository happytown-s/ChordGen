import { useRef, useEffect, useState } from 'react';
import type { Chord, Key, SoundType } from '../types';
import { PianoRoll } from './PianoRoll';
import { exportChordToMidi, getChordFilename, downloadMidi, isElectron, createMidiFileForDrag } from '../utils/midiExport';
import { playChord } from '../utils/audioEngine';

interface ChordBlockProps {
  chord: Chord;
  keyValue: Key;
  tempo: number;
  soundType: SoundType;
  index: number;
  progressionId: string;
  isPlaying?: boolean;
  onDragStart: (progId: string, index: number) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (progId: string, index: number) => void;
  onRegenerate: (progId: string, index: number) => void;
}

export function ChordBlock({
  chord,
  keyValue,
  tempo,
  soundType,
  index,
  progressionId,
  isPlaying = false,
  onDragStart,
  onDragOver,
  onDrop,
  onRegenerate,
}: ChordBlockProps) {
  const dragRef = useRef<HTMLDivElement>(null);
  const [midiFilePath, setMidiFilePath] = useState<string | null>(null);

  // Pre-create MIDI file for native drag in Electron
  useEffect(() => {
    if (isElectron()) {
      const blob = exportChordToMidi(chord, tempo);
      const filename = getChordFilename(chord);
      createMidiFileForDrag(blob, filename).then(setMidiFilePath);
    }
  }, [chord, tempo]);

  const handleDragStart = async (e: React.DragEvent) => {
    // For internal drag (reordering)
    onDragStart(progressionId, index);

    // Set drag data for internal use
    e.dataTransfer.setData('text/plain', chord.displayName);
    e.dataTransfer.setData('application/json', JSON.stringify({
      type: 'chord',
      progressionId,
      index
    }));

    // In Electron, use native file drag to DAW
    if (isElectron() && midiFilePath) {
      e.dataTransfer.effectAllowed = 'copyMove';
      // Call Electron's native startDrag API
      window.electronAPI!.startDrag(midiFilePath);
    } else {
      e.dataTransfer.effectAllowed = 'move';
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    onDrop(progressionId, index);
  };

  const handlePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    playChord(chord, tempo, soundType);
  };

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    const midiBlob = exportChordToMidi(chord, tempo);
    const filename = getChordFilename(chord);
    downloadMidi(midiBlob, filename);
  };

  const handleRegenerate = (e: React.MouseEvent) => {
    e.stopPropagation();
    onRegenerate(progressionId, index);
  };

  const inElectron = isElectron();

  return (
    <div
      ref={dragRef}
      draggable
      onDragStart={handleDragStart}
      onDragOver={onDragOver}
      onDrop={handleDrop}
      className={`bg-slate-700 rounded-lg p-4 cursor-grab active:cursor-grabbing hover:bg-slate-600 transition-colors border min-w-[220px] ${isPlaying ? 'border-green-500 bg-slate-600' : 'border-slate-600 hover:border-blue-500'
        }`}
    >
      {/* Chord Name */}
      <div className="text-center mb-3">
        <span className="text-2xl font-bold text-white">{chord.displayName}</span>
      </div>

      {/* Piano Roll */}
      <div className="flex justify-center">
        <PianoRoll notes={chord.notes} keyValue={keyValue} width={200} height={50} />
      </div>

      {/* Buttons */}
      <div className="flex items-center justify-center gap-2 mt-3">
        <button
          onClick={handlePlay}
          className="flex items-center gap-1 px-3 py-1 rounded bg-green-600 hover:bg-green-500 text-white text-xs transition-colors"
          title="Play chord"
        >
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path d="M6.3 2.841A1.5 1.5 0 004 4.11v11.78a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
          </svg>
          Play
        </button>
        <button
          onClick={handleRegenerate}
          className="flex items-center gap-1 px-2 py-1 rounded bg-slate-600 hover:bg-slate-500 text-white text-xs transition-colors"
          title="このコードを再生成"
        >
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M15.312 11.424a5.5 5.5 0 01-9.201 2.466l-.312-.311h2.433a.75.75 0 000-1.5H3.989a.75.75 0 00-.75.75v4.242a.75.75 0 001.5 0v-2.43l.31.31a7 7 0 0011.712-3.138.75.75 0 00-1.449-.39zm1.23-3.723a.75.75 0 00.219-.53V2.929a.75.75 0 00-1.5 0v2.43l-.31-.31A7 7 0 003.239 8.188a.75.75 0 101.448.389A5.5 5.5 0 0113.89 6.11l.311.31h-2.432a.75.75 0 000 1.5h4.243a.75.75 0 00.53-.219z" clipRule="evenodd" />
          </svg>
        </button>
        {!inElectron && (
          <button
            onClick={handleDownload}
            className="flex items-center gap-1 px-3 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white text-xs transition-colors"
            title="Download MIDI"
          >
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10.75 2.75a.75.75 0 00-1.5 0v8.614L6.295 8.235a.75.75 0 10-1.09 1.03l4.25 4.5a.75.75 0 001.09 0l4.25-4.5a.75.75 0 00-1.09-1.03l-2.955 3.129V2.75z" />
              <path d="M3.5 12.75a.75.75 0 00-1.5 0v2.5A2.75 2.75 0 004.75 18h10.5A2.75 2.75 0 0018 15.25v-2.5a.75.75 0 00-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5z" />
            </svg>
            MIDI
          </button>
        )}
      </div>

      {/* Drag hint */}
      {inElectron && (
        <div className="text-center mt-2">
          <span className="text-xs text-slate-400">Drag to DAW</span>
        </div>
      )}
    </div>
  );
}
