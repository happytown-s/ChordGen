import { useState, useCallback } from 'react';
import { Header } from './components/Header';
import { SettingsPanel } from './components/SettingsPanel';
import { ProgressionRow } from './components/ProgressionRow';
import { useChordProgression } from './hooks/useChordProgression';

function App() {
  const {
    state,
    setKey,
    setTempo,
    setGenre,
    setMood,
    setSoundType,
    generate,
    regenerateMain,
    regenerateBridge,
    swapChord,
    insertChord,
    regenerateSingleChord,
    updateChordDuration,
    getBorrowableChordsForKey,
    applySpecificBorrowedChord,
    extendProgression,
    shiftChordDegree,
  } = useChordProgression();

  // Drag state for chord swapping
  const [dragSource, setDragSource] = useState<{ progId: string; index: number } | null>(null);

  const handleDragStart = useCallback((progId: string, index: number) => {
    setDragSource({ progId, index });
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDrop = useCallback((targetProgId: string, targetIndex: number) => {
    if (dragSource) {
      swapChord(dragSource.progId, targetProgId, dragSource.index, targetIndex);
      setDragSource(null);
    }
  }, [dragSource, swapChord]);

  const { settings, mainProgression, bridgeProgressions } = state;

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      <Header />
      <SettingsPanel
        keyValue={settings.key}
        tempo={settings.tempo}
        genre={settings.genre}
        mood={settings.mood}
        soundType={settings.soundType}
        onKeyChange={setKey}
        onTempoChange={setTempo}
        onGenreChange={setGenre}
        onMoodChange={setMood}
        onSoundTypeChange={setSoundType}
        onGenerate={generate}
      />

      <main className="flex-1 p-6 space-y-6">
        {/* Main Progression */}
        {mainProgression.chords.length > 0 && (
          <ProgressionRow
            progression={mainProgression}
            keyValue={settings.key}
            tempo={settings.tempo}
            soundType={settings.soundType}
            isMain
            onRegenerate={regenerateMain}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onInsertChord={insertChord}
            onRegenerateChord={regenerateSingleChord}
            onDurationChange={updateChordDuration}
            getBorrowableChords={getBorrowableChordsForKey}
            onApplySpecificBorrowedChord={applySpecificBorrowedChord}
            onExtendProgression={extendProgression}
            onShiftChordDegree={shiftChordDegree}
          />
        )}

        {/* Bridge Progressions */}
        <div className="space-y-4">
          <h2 className="text-slate-400 text-sm font-medium uppercase tracking-wide">
            Bridge Suggestions
          </h2>
          {bridgeProgressions.map((bridge, index) => (
            <ProgressionRow
              key={bridge.id}
              progression={bridge}
              keyValue={settings.key}
              tempo={settings.tempo}
              soundType={settings.soundType}
              onRegenerate={() => regenerateBridge(index)}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onInsertChord={insertChord}
              onRegenerateChord={regenerateSingleChord}
              onDurationChange={updateChordDuration}
              getBorrowableChords={getBorrowableChordsForKey}
              onApplySpecificBorrowedChord={applySpecificBorrowedChord}
              onExtendProgression={extendProgression}
              onShiftChordDegree={shiftChordDegree}
            />
          ))}
        </div>

        {/* Instructions */}
        <div className="bg-slate-800/30 rounded-lg p-4 text-slate-400 text-sm">
          <h3 className="font-medium text-slate-300 mb-2">How to use:</h3>
          <ul className="list-disc list-inside space-y-1">
            <li>Click "Play" to preview chords or progressions</li>
            <li>Choose between Piano, Pad, or Sine sounds</li>
            <li>Click "MIDI" to download chord or progression as MIDI file</li>
            <li>Drag the downloaded .mid file into your DAW</li>
            <li>Drag chords between blocks to swap/reorder them</li>
            <li>Click "Regenerate" to get new chord variations</li>
          </ul>
        </div>
      </main>
    </div>
  );
}

export default App;
