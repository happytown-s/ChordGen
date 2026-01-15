import type { Chord, ChordProgression } from '../types';

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

// Get ADSR values based on sound type
function getADSR(soundType: SoundType) {
  switch (soundType) {
    case 'sine':
      return { attack: 0.02, decay: 0.1, sustain: 0.7, release: 0.3 };
    case 'piano':
      return { attack: 0.005, decay: 0.3, sustain: 0.4, release: 0.5 };
    case 'pad':
      return { attack: 0.3, decay: 0.2, sustain: 0.8, release: 0.8 };
  }
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

  harmonics.forEach((harmonic, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(frequency * harmonic, startTime);

    osc.connect(gain);
    gain.connect(destination);

    // Scale amplitude by harmonic weight
    const baseGain = 0.15 * amplitudes[i];
    const { attack, decay, sustain, release } = getADSR('piano');
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

// Resume audio context (needed for user interaction)
export function resumeAudio(): Promise<void> {
  const ctx = getAudioContext();
  return ctx.resume();
}
