import { useRef, useState, useCallback, useEffect } from 'react';
import type { ChordProgression, Key, SoundType, NoteName, ChordQuality, BasslinePattern, ChordPattern } from '../types';
import { ChordBlock } from './ChordBlock';
import { InsertButton } from './InsertButton';
import { FullPianoRoll } from './FullPianoRoll';
import { exportProgressionToMidi, getProgressionFilename, downloadMidi, isElectron, createMidiFileForDrag } from '../utils/midiExport';
import { playProgressionWithPattern, playBassline } from '../utils/audioEngine';
import { generateProgressionBassline } from '../utils/basslineGenerator';

interface ProgressionRowProps {
  progression: ChordProgression;
  keyValue: Key;
  tempo: number;
  soundType: SoundType;
  isMain?: boolean;
  showPianoRoll?: boolean;
  onRegenerate: () => void;
  onDragStart: (progId: string, index: number) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (progId: string, index: number) => void;
  onInsertChord: (progId: string, insertIndex: number) => void;
  onRegenerateChord: (progId: string, index: number) => void;
  onDurationChange: (progId: string, index: number, durationBeats: number) => void;
  getBorrowableChords: () => { root: NoteName; quality: ChordQuality; degree: string; borrowedFrom: 'parallel-minor' | 'parallel-major' }[];
  onApplySpecificBorrowedChord: (progId: string, index: number, root: NoteName, quality: ChordQuality, degree: string, borrowedFrom: 'parallel-minor' | 'parallel-major') => void;
  onExtendProgression: (progId: string) => void;
  onShiftChordDegree: (progId: string, index: number, direction: 1 | -1) => void;
}

export function ProgressionRow({
  progression,
  keyValue,
  tempo,
  soundType,
  isMain = false,
  showPianoRoll = true,
  onRegenerate,
  onDragStart,
  onDragOver,
  onDrop,
  onInsertChord,
  onRegenerateChord,
  onDurationChange,
  getBorrowableChords,
  onApplySpecificBorrowedChord,
  onExtendProgression,
  onShiftChordDegree,
}: ProgressionRowProps) {
  const rowRef = useRef<HTMLDivElement>(null);
  const [playingIndex, setPlayingIndex] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const stopRef = useRef<{ chord?: () => void; bass?: () => void }>({});
  const [midiFilePath, setMidiFilePath] = useState<string | null>(null);
  const [basslinePattern, setBasslinePattern] = useState<BasslinePattern>('none');
  const [chordPattern, setChordPattern] = useState<ChordPattern>('sustain');
  const [strumAmount, setStrumAmount] = useState(50); // -100〜100、負=ダウン、正=アップ
  const [chordsMuted, setChordsMuted] = useState(false);
  const [bassMuted, setBassMuted] = useState(false);

  // Pre-create MIDI file for native drag in Electron
  useEffect(() => {
    if (isElectron() && progression.chords.length > 0) {
      const blob = exportProgressionToMidi(progression, tempo);
      const filename = getProgressionFilename(progression);
      createMidiFileForDrag(blob, filename).then(setMidiFilePath);
    }
  }, [progression, tempo]);

  const handlePlayAll = useCallback(() => {
    if (isPlaying) {
      // 停止
      stopRef.current.chord?.();
      stopRef.current.bass?.();
      setIsPlaying(false);
      setPlayingIndex(null);
      stopRef.current = {};
      return;
    }

    setIsPlaying(true);

    // コード再生（ミュート時はスキップ）
    if (!chordsMuted && progression.chords.length > 0) {
      const { stop } = playProgressionWithPattern(progression, tempo, soundType, chordPattern, strumAmount, (index) => {
        setPlayingIndex(index);
        // Reset after last chord
        if (index === progression.chords.length - 1) {
          const lastChordDuration = (progression.chords[index].durationBeats * 60) / tempo;
          setTimeout(() => {
            setIsPlaying(false);
            setPlayingIndex(null);
            stopRef.current = {};
          }, lastChordDuration * 1000);
        }
      });
      stopRef.current.chord = stop;
    }

    // ベースライン再生（ミュート時またはパターンがnoneの場合はスキップ）
    if (!bassMuted && basslinePattern !== 'none' && progression.chords.length > 0) {
      const bassNotes = generateProgressionBassline(progression.chords, basslinePattern);
      if (bassNotes.length > 0) {
        const { stop } = playBassline(bassNotes, tempo);
        stopRef.current.bass = stop;
      }
    }

    // コードがミュートされている場合は、ベースラインの長さで再生終了を判定
    if (chordsMuted && !bassMuted && basslinePattern !== 'none') {
      const totalBeats = progression.chords.reduce((acc, c) => acc + c.durationBeats, 0);
      const totalDuration = (totalBeats * 60) / tempo;
      setTimeout(() => {
        setIsPlaying(false);
        setPlayingIndex(null);
        stopRef.current = {};
      }, totalDuration * 1000);
    }
  }, [isPlaying, progression, tempo, soundType, basslinePattern, chordPattern, strumAmount, chordsMuted, bassMuted]);

  const handleDownloadAll = () => {
    // ミュート状態に応じてMIDI出力を調整
    const effectiveBassPattern = bassMuted ? 'none' : basslinePattern;
    const effectiveChordPattern = chordsMuted ? 'sustain' : chordPattern; // ミュート時はデフォルト
    const effectiveStrumAmount = chordsMuted ? 50 : strumAmount;
    const midiBlob = exportProgressionToMidi(
      chordsMuted ? { ...progression, chords: [] } : progression,
      tempo,
      effectiveBassPattern as BasslinePattern,
      effectiveChordPattern,
      effectiveStrumAmount
    );
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
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-4">
        <div className="flex items-center gap-3">
          <h3 className={`font-semibold ${isMain ? 'text-blue-400 text-lg' : 'text-slate-300'}`}>
            {progression.label}
          </h3>
          {isMain && (
            <span className="bg-blue-600 text-white text-xs px-2 py-0.5 rounded">Primary</span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Play All Button */}
          <button
            onClick={handlePlayAll}
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
                <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
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

          {/* Bassline Pattern Selector */}
          <select
            value={basslinePattern}
            onChange={(e) => setBasslinePattern(e.target.value as BasslinePattern)}
            className="px-2 py-1 rounded text-sm bg-slate-700 text-slate-200 border border-slate-600 hover:border-blue-500 transition-colors"
            title="ベースラインパターン"
          >
            <option value="none">Bass: なし</option>
            <option value="root-only">Bass: ルート</option>
            <option value="root-fifth">Bass: ルート+5度</option>
            <option value="walking">Bass: ウォーキング</option>
            <option value="syncopated">Bass: シンコペ</option>
            <option value="octave">Bass: オクターブ</option>
          </select>

          {/* Chord Pattern Selector */}
          <select
            value={chordPattern}
            onChange={(e) => setChordPattern(e.target.value as ChordPattern)}
            className="px-2 py-1 rounded text-sm bg-slate-700 text-slate-200 border border-slate-600 hover:border-purple-500 transition-colors"
            title="コードパターン"
          >
            <option value="sustain">Chord: サステイン</option>
            <option value="arpeggio-up">Chord: アルペジオ↑</option>
            <option value="arpeggio-down">Chord: アルペジオ↓</option>
            <option value="staccato">Chord: スタッカート</option>
            <option value="strum">Chord: ストラム</option>
          </select>

          {/* Strum Amount Slider (ストラム選択時のみ表示) */}
          {chordPattern === 'strum' && (
            <div className="flex items-center gap-2 px-2 py-1 rounded bg-slate-700 border border-purple-500">
              <span className="text-xs text-slate-400 whitespace-nowrap">
                {strumAmount < 0 ? '↓' : '↑'}
              </span>
              <input
                type="range"
                min={-100}
                max={100}
                value={strumAmount}
                onChange={(e) => setStrumAmount(Number(e.target.value))}
                className="w-20 h-2 accent-purple-500"
                title={`ストラム: ${strumAmount}% (${strumAmount < 0 ? 'ダウン' : 'アップ'}ストローク)`}
              />
              <span className="text-xs text-slate-300 w-8 text-right">
                {strumAmount}%
              </span>
            </div>
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

      {/* Chord Blocks with Insert Buttons */}
      <div className="flex gap-1 items-center overflow-x-auto pb-2">
        {progression.chords.map((chord, index) => (
          <div key={chord.id} className="flex items-center gap-1">
            {/* Insert Button (between chords, not before first) */}
            {index > 0 && (
              <InsertButton
                progressionId={progression.id}
                insertIndex={index}
                onInsertChord={onInsertChord}
              />
            )}
            <ChordBlock
              chord={chord}
              keyValue={keyValue}
              tempo={tempo}
              soundType={soundType}
              index={index}
              progressionId={progression.id}
              isPlaying={playingIndex === index}
              showPianoRoll={showPianoRoll}
              onDragStart={onDragStart}
              onDragOver={onDragOver}
              onDrop={onDrop}
              onRegenerate={onRegenerateChord}
              onDurationChange={onDurationChange}
              getBorrowableChords={getBorrowableChords}
              onApplySpecificBorrowedChord={onApplySpecificBorrowedChord}
              onShiftChordDegree={onShiftChordDegree}
            />
          </div>
        ))}

        {/* ADD Button - 8ブロック未満の時のみ表示 */}
        {progression.chords.length < 8 && (
          <button
            onClick={() => onExtendProgression(progression.id)}
            className="flex flex-col items-center justify-center min-w-[80px] h-[140px] border-2 border-dashed border-slate-500 rounded-lg text-slate-400 hover:border-green-500 hover:text-green-400 hover:bg-slate-800/50 transition-colors"
            title="進行を拡張（4ブロック追加）"
          >
            <svg className="w-6 h-6 mb-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            <span className="text-xs">ADD</span>
          </button>
        )}
      </div>

      {/* Full Piano Roll Panel */}
      <FullPianoRoll
        chords={progression.chords}
        basslinePattern={basslinePattern}
        tempo={tempo}
        soundType={soundType}
        onMuteChange={(cm, bm) => {
          setChordsMuted(cm);
          setBassMuted(bm);
        }}
      />
    </div>
  );
}
