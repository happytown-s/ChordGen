import type { Chord, ChordProgression, ChordPattern } from '../types';
import { generateProgressionChordNotes } from './chordPatternGenerator';

export type SoundType = 'sine' | 'piano' | 'pad';

// Audio context singleton
let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new AudioContext();
  }
  return audioContext;
}

// Convert MIDI note to frequency
function midiToFrequency(midiNote: number): number {
  return 440 * Math.pow(2, (midiNote - 69) / 12);
}

// Create ADSR envelope
function createEnvelope(
  _ctx: AudioContext,
  gainNode: GainNode,
  startTime: number,
  duration: number,
  soundType: SoundType
) {
  const { attack, decay, sustain, release } = getADSR(soundType);
  const endTime = startTime + duration;

  gainNode.gain.setValueAtTime(0, startTime);
  gainNode.gain.linearRampToValueAtTime(0.3, startTime + attack);
  gainNode.gain.linearRampToValueAtTime(sustain * 0.3, startTime + attack + decay);
  gainNode.gain.setValueAtTime(sustain * 0.3, endTime - release);
  gainNode.gain.linearRampToValueAtTime(0, endTime);
}

// ADSR configuration cache
const ADSR_CONFIG = {
  sine: { attack: 0.02, decay: 0.1, sustain: 0.7, release: 0.3 },
  piano: { attack: 0.005, decay: 0.3, sustain: 0.4, release: 0.5 },
  pad: { attack: 0.3, decay: 0.2, sustain: 0.8, release: 0.8 },
};

// Get ADSR values based on sound type
function getADSR(soundType: SoundType) {
  return ADSR_CONFIG[soundType];
}

// Create oscillator for a single note (sine wave)
function createSineOscillator(
  ctx: AudioContext,
  frequency: number,
  startTime: number,
  duration: number,
  destination: AudioNode
) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(frequency, startTime);

  osc.connect(gain);
  gain.connect(destination);

  createEnvelope(ctx, gain, startTime, duration, 'sine');

  osc.start(startTime);
  osc.stop(startTime + duration + 0.5);
}

// Create piano-like sound using multiple oscillators with harmonics
function createPianoSound(
  ctx: AudioContext,
  frequency: number,
  startTime: number,
  duration: number,
  destination: AudioNode
) {
  // Fundamental + harmonics for piano-like timbre
  const harmonics = [1, 2, 3, 4, 5, 6];
  const amplitudes = [1, 0.5, 0.25, 0.125, 0.06, 0.03];

  const adsr = getADSR('piano');

  harmonics.forEach((harmonic, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(frequency * harmonic, startTime);

    osc.connect(gain);
    gain.connect(destination);

    // Scale amplitude by harmonic weight
    const baseGain = 0.15 * amplitudes[i];
    const { attack, decay, sustain, release } = adsr;
    const endTime = startTime + duration;

    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(baseGain, startTime + attack);
    gain.gain.exponentialRampToValueAtTime(baseGain * sustain, startTime + attack + decay);
    gain.gain.setValueAtTime(baseGain * sustain * 0.5, endTime - release);
    gain.gain.linearRampToValueAtTime(0.001, endTime);

    osc.start(startTime);
    osc.stop(startTime + duration + 0.5);
  });
}

// Create pad sound using detuned oscillators
function createPadSound(
  ctx: AudioContext,
  frequency: number,
  startTime: number,
  duration: number,
  destination: AudioNode
) {
  const detunes = [-10, 0, 10]; // Slight detune for chorus effect

  detunes.forEach((detune) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(frequency, startTime);
    osc.detune.setValueAtTime(detune, startTime);

    // Low-pass filter for softer sound
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2000, startTime);
    filter.Q.setValueAtTime(1, startTime);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(destination);

    createEnvelope(ctx, gain, startTime, duration, 'pad');

    osc.start(startTime);
    osc.stop(startTime + duration + 1);
  });
}

// Play a single note
function playNote(
  ctx: AudioContext,
  midiNote: number,
  startTime: number,
  duration: number,
  soundType: SoundType,
  destination: AudioNode
) {
  const frequency = midiToFrequency(midiNote);

  switch (soundType) {
    case 'sine':
      createSineOscillator(ctx, frequency, startTime, duration, destination);
      break;
    case 'piano':
      createPianoSound(ctx, frequency, startTime, duration, destination);
      break;
    case 'pad':
      createPadSound(ctx, frequency, startTime, duration, destination);
      break;
  }
}

// Play a single note with velocity
function playNoteWithVelocity(
  ctx: AudioContext,
  midiNote: number,
  startTime: number,
  duration: number,
  soundType: SoundType,
  destination: AudioNode,
  velocity: number = 80
) {
  const frequency = midiToFrequency(midiNote);
  // velocityをゲインに変換 (0-127 -> 0-1)
  const velocityGain = velocity / 127;

  // 一時的なゲインノードでベロシティを適用
  const velocityNode = ctx.createGain();
  velocityNode.gain.setValueAtTime(velocityGain, startTime);
  velocityNode.connect(destination);

  switch (soundType) {
    case 'sine':
      createSineOscillator(ctx, frequency, startTime, duration, velocityNode);
      break;
    case 'piano':
      createPianoSound(ctx, frequency, startTime, duration, velocityNode);
      break;
    case 'pad':
      createPadSound(ctx, frequency, startTime, duration, velocityNode);
      break;
  }
}

// Play a chord
export function playChord(
  chord: Chord,
  tempo: number,
  soundType: SoundType = 'piano'
): void {
  const ctx = getAudioContext();
  if (ctx.state === 'suspended') {
    ctx.resume();
  }

  const masterGain = ctx.createGain();
  masterGain.gain.setValueAtTime(0.5, ctx.currentTime);
  masterGain.connect(ctx.destination);

  const duration = (chord.durationBeats * 60) / tempo;
  const startTime = ctx.currentTime;

  // Play all notes in the chord
  chord.notes.forEach((note) => {
    playNote(ctx, note, startTime, duration, soundType, masterGain);
  });
}

// Play a chord progression
export function playProgression(
  progression: ChordProgression,
  tempo: number,
  soundType: SoundType = 'piano',
  onChordPlay?: (index: number) => void
): { stop: () => void } {
  const ctx = getAudioContext();
  if (ctx.state === 'suspended') {
    ctx.resume();
  }

  const masterGain = ctx.createGain();
  masterGain.gain.setValueAtTime(0.5, ctx.currentTime);
  masterGain.connect(ctx.destination);

  let currentTime = ctx.currentTime;
  const timeouts: number[] = [];

  progression.chords.forEach((chord, index) => {
    const duration = (chord.durationBeats * 60) / tempo;
    const chordStartTime = currentTime;

    // Schedule callback for visual feedback
    const delay = (chordStartTime - ctx.currentTime) * 1000;
    if (onChordPlay) {
      const timeout = window.setTimeout(() => onChordPlay(index), delay);
      timeouts.push(timeout);
    }

    // Play all notes in the chord
    chord.notes.forEach((note) => {
      playNote(ctx, note, chordStartTime, duration, soundType, masterGain);
    });

    currentTime += duration;
  });

  // Return stop function
  return {
    stop: () => {
      timeouts.forEach(clearTimeout);
      masterGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.1);
    },
  };
}

// メロディ再生（単体）
export function playMelody(notes: import('./melodyGenerator').MelodyNote[], tempo: number): { stop: () => void } {
  if (notes.length === 0) return { stop: () => { } };

  // 全体の長さを計算し、再生終了を管理するためのタイマー
  const ctx = getAudioContext();
  const timeouts: number[] = [];
  const oscs: OscillatorNode[] = [];

  const now = ctx.currentTime;

  notes.forEach(note => {
    const startTime = now + (note.startBeat * 60) / tempo;
    const duration = (note.durationBeats * 60) / tempo;

    const timeoutId = window.setTimeout(() => {
      // リードシンセっぽい音色
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      osc.type = 'sawtooth'; // 矩形波に近い方がメロディっぽい場合もあるが、sawtoothでフィルタかけるのが無難
      osc.frequency.setValueAtTime(440 * Math.pow(2, (note.midiNote - 69) / 12), ctx.currentTime);

      // フィルターエンベロープ（少しプラック感）
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(800, ctx.currentTime);
      filter.frequency.exponentialRampToValueAtTime(2000, ctx.currentTime + 0.05);

      // 音量エンベロープ
      const noteVel = note.velocity / 127;
      gainNode.gain.setValueAtTime(0, ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.15 * noteVel, ctx.currentTime + 0.02); // アタック
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration); // リリース

      osc.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + duration);

      oscs.push(osc);
    }, (startTime - now) * 1000);

    timeouts.push(timeoutId);
  });

  return {
    stop: () => {
      timeouts.forEach(id => clearTimeout(id));
      oscs.forEach(osc => {
        try { osc.stop(); } catch (e) { /* ignore */ }
      });
    }
  };
}

// Play a chord progression with pattern
export function playProgressionWithPattern(
  progression: ChordProgression,
  tempo: number,
  soundType: SoundType = 'piano',
  chordPattern: ChordPattern = 'sustain',
  strumAmount: number = 50,
  onChordPlay?: (index: number) => void
): { stop: () => void } {
  // サステインパターンの場合は既存のロジックを使用
  if (chordPattern === 'sustain') {
    return playProgression(progression, tempo, soundType, onChordPlay);
  }

  const ctx = getAudioContext();
  if (ctx.state === 'suspended') {
    ctx.resume();
  }

  const masterGain = ctx.createGain();
  masterGain.gain.setValueAtTime(0.5, ctx.currentTime);
  masterGain.connect(ctx.destination);

  const baseTime = ctx.currentTime;
  const timeouts: number[] = [];

  // パターンに基づいたノートを生成
  const chordNotes = generateProgressionChordNotes(progression.chords, chordPattern, strumAmount);

  // コードごとのコールバック用（最初のノートでトリガー）
  let currentChordBeat = 0;
  progression.chords.forEach((chord, index) => {
    const delay = (currentChordBeat * 60 / tempo) * 1000;
    if (onChordPlay) {
      const timeout = window.setTimeout(() => onChordPlay(index), delay);
      timeouts.push(timeout);
    }
    currentChordBeat += chord.durationBeats;
  });

  // 各ノートを再生
  chordNotes.forEach((note) => {
    const startTime = baseTime + (note.startBeat * 60) / tempo;
    const duration = (note.durationBeats * 60) / tempo;
    playNoteWithVelocity(ctx, note.midiNote, startTime, duration, soundType, masterGain, note.velocity);
  });

  return {
    stop: () => {
      timeouts.forEach(clearTimeout);
      masterGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.1);
    },
  };
}

// Resume audio context (needed for user interaction)
export function resumeAudio(): Promise<void> {
  const ctx = getAudioContext();
  return ctx.resume();
}

// ベースサウンド生成（低音用）
function createBassSound(
  ctx: AudioContext,
  frequency: number,
  startTime: number,
  duration: number,
  destination: AudioNode,
  velocity: number = 90
) {
  // Sub bass (sine) + harmonics for punchy bass
  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();

  // Sub bass (fundamental)
  osc1.type = 'sine';
  osc1.frequency.setValueAtTime(frequency, startTime);

  // Upper harmonics (triangle for warmth)
  osc2.type = 'triangle';
  osc2.frequency.setValueAtTime(frequency * 2, startTime);

  // Low-pass filter
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(800, startTime);
  filter.Q.setValueAtTime(2, startTime);

  const gainNode1 = ctx.createGain();
  const gainNode2 = ctx.createGain();

  // Velocity scaling
  const velScale = velocity / 127;
  gainNode1.gain.setValueAtTime(0.4 * velScale, startTime);
  gainNode2.gain.setValueAtTime(0.15 * velScale, startTime);

  osc1.connect(gainNode1);
  osc2.connect(gainNode2);
  gainNode1.connect(filter);
  gainNode2.connect(filter);
  filter.connect(gain);
  gain.connect(destination);

  // Punchy envelope
  const attack = 0.01;
  const decay = 0.1;
  const sustain = 0.6;
  const release = 0.15;
  const endTime = startTime + duration;

  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(0.5 * velScale, startTime + attack);
  gain.gain.linearRampToValueAtTime(sustain * 0.5 * velScale, startTime + attack + decay);
  gain.gain.setValueAtTime(sustain * 0.5 * velScale, endTime - release);
  gain.gain.linearRampToValueAtTime(0, endTime);

  osc1.start(startTime);
  osc1.stop(endTime + 0.1);
  osc2.start(startTime);
  osc2.stop(endTime + 0.1);
}

// ベースラインを再生
import type { BassNote } from './basslineGenerator';

export function playBassline(
  bassNotes: BassNote[],
  tempo: number,
  onNotePlay?: (index: number) => void
): { stop: () => void } {
  const ctx = getAudioContext();
  if (ctx.state === 'suspended') {
    ctx.resume();
  }

  const masterGain = ctx.createGain();
  masterGain.gain.setValueAtTime(0.7, ctx.currentTime);
  masterGain.connect(ctx.destination);

  const baseTime = ctx.currentTime;
  const timeouts: number[] = [];

  bassNotes.forEach((note, index) => {
    const startTime = baseTime + (note.startBeat * 60) / tempo;
    const duration = (note.durationBeats * 60) / tempo;
    const frequency = 440 * Math.pow(2, (note.midiNote - 69) / 12);

    // Schedule callback for visual feedback
    const delay = (startTime - ctx.currentTime) * 1000;
    if (onNotePlay) {
      const timeout = window.setTimeout(() => onNotePlay(index), delay);
      timeouts.push(timeout);
    }

    createBassSound(ctx, frequency, startTime, duration, masterGain, note.velocity);
  });

  return {
    stop: () => {
      timeouts.forEach(clearTimeout);
      masterGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.1);
    },
  };
}
