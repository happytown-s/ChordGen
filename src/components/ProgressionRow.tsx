import { useRef, useState, useCallback, useEffect } from 'react';
import type { ChordProgression, Key, SoundType } from '../types';
import { ChordBlock } from './ChordBlock';
import { exportProgressionToMidi, getProgressionFilename, downloadMidi, isElectron, createMidiFileForDrag } from '../utils/midiExport';
import { playProgression } from '../utils/audioEngine';

interface ProgressionRowProps {
  progression: ChordProgression;
  keyValue: Key;
  tempo: number;
  soundType: SoundType;
  isMain?: boolean;
  onRegenerate: () => void;
  onDragStart: (progId: string, index: number) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (progId: string, index: number) => void;
}

export function ProgressionRow({
  progression,
  keyValue,
  tempo,
  soundType,
  isMain = false,
  onRegenerate,
  onDragStart,
  onDragOver,
  onDrop,
}: ProgressionRowProps) {
  const rowRef = useRef<HTMLDivElement>(null);
  const [playingIndex, setPlayingIndex] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const stopRef = useRef<(() => void) | null>(null);
  const [midiFilePath, setMidiFilePath] = useState<string | null>(null);

  // Pre-create MIDI file for native drag in Electron
  useEffect(() => {
    if (isElectron() && progression.chords.length > 0) {
      const blob = exportProgressionToMidi(progression, tempo);
      const filename = getProgressionFilename(progression);
      createMidiFileForDrag(blob, filename).then(setMidiFilePath);
    }
  }, [progression, tempo]);

  const handlePlayAll = useCallback(() => {
    if (isPlaying && stopRef.current) {
      stopRef.current();
      setIsPlaying(false);
      setPlayingIndex(null);
      stopRef.current = null;
      return;
    }

    setIsPlaying(true);
    const { stop } = playProgression(progression, tempo, soundType, (index) => {
      setPlayingIndex(index);
      // Reset after last chord
      if (index === progression.chords.length - 1) {
        const lastChordDuration = (progression.chords[index].durationBeats * 60) / tempo;
        setTimeout(() => {
          setIsPlaying(false);
          setPlayingIndex(null);
          stopRef.current = null;
        }, lastChordDuration * 1000);
      }
    });
    stopRef.current = stop;
  }, [isPlaying, progression, tempo, soundType]);

  const handleDownloadAll = () => {
    const midiBlob = exportProgressionToMidi(progression, tempo);
    const filename = getProgressionFilename(progression);
    downloadMidi(midiBlob, filename);
  };

  const handleProgressionDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('text/plain', progression.label);

    // In Electron, use native file drag to DAW
    if (isElectron() && midiFilePath) {
      e.dataTransfer.effectAllowed = 'copy';
      // Call Electron's native startDrag API
      window.electronAPI!.startDrag(midiFilePath);
    }
  };

  const inElectron = isElectron();

  return (
    <div
      ref={rowRef}
      className={`p-4 rounded-lg ${isMain ? 'bg-slate-800/80' : 'bg-slate-800/50'}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h3 className={`font-semibold ${isMain ? 'text-blue-400 text-lg' : 'text-slate-300'}`}>
            {progression.label}
          </h3>
          {isMain && (
            <span className="bg-blue-600 text-white text-xs px-2 py-0.5 rounded">Primary</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Play All Button */}
          <button
            onClick={handlePlayAll}
            className={`flex items-center gap-1.5 px-3 py-1 rounded text-sm transition-colors ${
              isPlaying
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
                Play
              </>
            )}
          </button>

          {/* Download All / Drag to DAW Button */}
          {inElectron ? (
            <div
              draggable
              onDragStart={handleProgressionDragStart}
              className="flex items-center gap-1.5 px-3 py-1 rounded text-sm bg-blue-600 hover:bg-blue-500 text-white transition-colors cursor-grab active:cursor-grabbing"
              title="Drag to DAW"
            >
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
              </svg>
              Drag MIDI
            </div>
          ) : (
            <button
              onClick={handleDownloadAll}
              className="flex items-center gap-1.5 px-3 py-1 rounded text-sm bg-blue-600 hover:bg-blue-500 text-white transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10.75 2.75a.75.75 0 00-1.5 0v8.614L6.295 8.235a.75.75 0 10-1.09 1.03l4.25 4.5a.75.75 0 001.09 0l4.25-4.5a.75.75 0 00-1.09-1.03l-2.955 3.129V2.75z" />
                <path d="M3.5 12.75a.75.75 0 00-1.5 0v2.5A2.75 2.75 0 004.75 18h10.5A2.75 2.75 0 0018 15.25v-2.5a.75.75 0 00-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5z" />
              </svg>
              MIDI
            </button>
          )}

          {/* Regenerate Button */}
          <button
            onClick={onRegenerate}
            className="flex items-center gap-1.5 px-3 py-1 rounded text-sm bg-slate-600 hover:bg-slate-500 text-white transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M15.312 11.424a5.5 5.5 0 01-9.201 2.466l-.312-.311h2.433a.75.75 0 000-1.5H3.989a.75.75 0 00-.75.75v4.242a.75.75 0 001.5 0v-2.43l.31.31a7 7 0 0011.712-3.138.75.75 0 00-1.449-.39zm1.23-3.723a.75.75 0 00.219-.53V2.929a.75.75 0 00-1.5 0v2.43l-.31-.31A7 7 0 003.239 8.188a.75.75 0 101.448.389A5.5 5.5 0 0113.89 6.11l.311.31h-2.432a.75.75 0 000 1.5h4.243a.75.75 0 00.53-.219z" clipRule="evenodd" />
            </svg>
            Regenerate
          </button>
        </div>
      </div>

      {/* Chord Blocks */}
      <div className="flex gap-3 overflow-x-auto pb-2">
        {progression.chords.map((chord, index) => (
          <ChordBlock
            key={chord.id}
            chord={chord}
            keyValue={keyValue}
            tempo={tempo}
            soundType={soundType}
            index={index}
            progressionId={progression.id}
            isPlaying={playingIndex === index}
            onDragStart={onDragStart}
            onDragOver={onDragOver}
            onDrop={onDrop}
          />
        ))}
      </div>
    </div>
  );
}
