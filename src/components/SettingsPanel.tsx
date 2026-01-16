import type { Key, Genre, Mood, SoundType, NoteName, ScaleType } from '../types';
import { NOTE_NAMES } from '../utils/musicTheory';

interface SettingsPanelProps {
  keyValue: Key;
  tempo: number;
  genre: Genre;
  mood: Mood;
  soundType: SoundType;
  onKeyChange: (key: Key) => void;
  onTempoChange: (tempo: number) => void;
  onGenreChange: (genre: Genre) => void;
  onMoodChange: (mood: Mood) => void;
  onSoundTypeChange: (soundType: SoundType) => void;
  onGenerate: () => void;
}

const GENRES: Genre[] = [
  'Lo-Fi', 'Neo Soul', 'Jazz', 'Pop', 'R&B', 'Rock', 'EDM', 'Hip Hop', 'Funk',
  'House', 'UK Garage', 'Future Bass',
  'Drum & Bass', 'Trance', 'Techno', 'Dubstep', 'Ambient',
  'Bossa Nova', 'Reggae', 'Country', 'Blues', 'Gospel', 'Metal',
  'Latin', 'City Pop'
];
const MOODS: Mood[] = ['Uplifting', 'Melancholic', 'Chill', 'Dark', 'Dreamy', 'Energetic'];
const SCALES: ScaleType[] = ['major', 'minor'];
const SOUND_TYPES: { value: SoundType; label: string }[] = [
  { value: 'piano', label: 'Piano' },
  { value: 'pad', label: 'Pad' },
  { value: 'sine', label: 'Sine' },
];

export function SettingsPanel({
  keyValue,
  tempo,
  genre,
  mood,
  soundType,
  onKeyChange,
  onTempoChange,
  onGenreChange,
  onMoodChange,
  onSoundTypeChange,
  onGenerate,
}: SettingsPanelProps) {
  return (
    <div className="bg-slate-800 border-b border-slate-700 px-6 py-4">
      <div className="flex flex-wrap items-center gap-6">
        {/* Key Selection */}
        <div className="flex items-center gap-2">
          <label className="text-slate-300 text-sm font-medium">Key:</label>
          <select
            value={keyValue.root}
            onChange={(e) => onKeyChange({ ...keyValue, root: e.target.value as NoteName })}
            className="bg-slate-700 text-white px-3 py-1.5 rounded-md border border-slate-600 focus:outline-none focus:border-blue-500"
          >
            {NOTE_NAMES.map((note) => (
              <option key={note} value={note}>{note}</option>
            ))}
          </select>
          <select
            value={keyValue.scale}
            onChange={(e) => onKeyChange({ ...keyValue, scale: e.target.value as ScaleType })}
            className="bg-slate-700 text-white px-3 py-1.5 rounded-md border border-slate-600 focus:outline-none focus:border-blue-500"
          >
            {SCALES.map((scale) => (
              <option key={scale} value={scale}>{scale === 'major' ? 'Major' : 'Minor'}</option>
            ))}
          </select>
        </div>

        {/* Tempo */}
        <div className="flex items-center gap-2">
          <label className="text-slate-300 text-sm font-medium">Tempo:</label>
          <input
            type="number"
            value={tempo}
            onChange={(e) => onTempoChange(Math.max(40, Math.min(200, parseInt(e.target.value) || 120)))}
            min={40}
            max={200}
            className="bg-slate-700 text-white px-3 py-1.5 rounded-md border border-slate-600 focus:outline-none focus:border-blue-500 w-20"
          />
          <span className="text-slate-400 text-sm">BPM</span>
        </div>

        {/* Genre */}
        <div className="flex items-center gap-2">
          <label className="text-slate-300 text-sm font-medium">Genre:</label>
          <select
            value={genre}
            onChange={(e) => onGenreChange(e.target.value as Genre)}
            className="bg-slate-700 text-white px-3 py-1.5 rounded-md border border-slate-600 focus:outline-none focus:border-blue-500"
          >
            {GENRES.map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
        </div>

        {/* Mood */}
        <div className="flex items-center gap-2">
          <label className="text-slate-300 text-sm font-medium">Mood:</label>
          <select
            value={mood}
            onChange={(e) => onMoodChange(e.target.value as Mood)}
            className="bg-slate-700 text-white px-3 py-1.5 rounded-md border border-slate-600 focus:outline-none focus:border-blue-500"
          >
            {MOODS.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>

        {/* Sound Type */}
        <div className="flex items-center gap-2">
          <label className="text-slate-300 text-sm font-medium">Sound:</label>
          <select
            value={soundType}
            onChange={(e) => onSoundTypeChange(e.target.value as SoundType)}
            className="bg-slate-700 text-white px-3 py-1.5 rounded-md border border-slate-600 focus:outline-none focus:border-blue-500"
          >
            {SOUND_TYPES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>

        {/* Generate Button */}
        <button
          onClick={onGenerate}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-1.5 rounded-md font-medium transition-colors ml-auto"
        >
          Generate
        </button>
      </div>
    </div>
  );
}
