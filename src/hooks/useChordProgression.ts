import { useReducer, useCallback, useEffect } from 'react';
import type { AppState, AppAction, Key, Genre, Mood, SoundType, ChordProgression } from '../types';
import { generateProgressions, regenerateProgression, generatePassingChord, generateSingleChord } from '../utils/chordGenerator';

const initialState: AppState = {
  settings: {
    key: { root: 'C', scale: 'major' },
    tempo: 90,
    genre: 'Lo-Fi',
    mood: 'Chill',
    soundType: 'piano',
  },
  mainProgression: {
    id: 'main',
    chords: [],
    label: 'Main',
  },
  bridgeProgressions: [],
};

function reducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_KEY':
      return {
        ...state,
        settings: { ...state.settings, key: action.payload },
      };
    case 'SET_TEMPO':
      return {
        ...state,
        settings: { ...state.settings, tempo: action.payload },
      };
    case 'SET_GENRE':
      return {
        ...state,
        settings: { ...state.settings, genre: action.payload },
      };
    case 'SET_MOOD':
      return {
        ...state,
        settings: { ...state.settings, mood: action.payload },
      };
    case 'SET_SOUND_TYPE':
      return {
        ...state,
        settings: { ...state.settings, soundType: action.payload },
      };
    case 'SET_PROGRESSIONS':
      return {
        ...state,
        mainProgression: action.payload.main,
        bridgeProgressions: action.payload.bridges,
      };
    case 'REGENERATE_MAIN': {
      const { key, genre, mood } = state.settings;
      const newMain = regenerateProgression(key, genre, mood, 'Main');
      return {
        ...state,
        mainProgression: newMain,
      };
    }
    case 'REGENERATE_BRIDGE': {
      const { key, genre, mood } = state.settings;
      const bridgeIndex = action.payload;
      const label = `Bridge ${bridgeIndex + 1}`;
      const newBridge = regenerateProgression(key, genre, mood, label);
      const newBridges = [...state.bridgeProgressions];
      newBridges[bridgeIndex] = newBridge;
      return {
        ...state,
        bridgeProgressions: newBridges,
      };
    }
    case 'SWAP_CHORD': {
      const { sourceProgId, targetProgId, sourceIdx, targetIdx } = action.payload;

      // Find source and target progressions
      const findProgression = (id: string): ChordProgression | null => {
        if (state.mainProgression.id === id) return state.mainProgression;
        return state.bridgeProgressions.find(p => p.id === id) || null;
      };

      const sourceProg = findProgression(sourceProgId);
      const targetProg = findProgression(targetProgId);

      if (!sourceProg || !targetProg) return state;

      // Clone chords arrays
      const sourceChords = [...sourceProg.chords];
      const targetChords = sourceProgId === targetProgId ? sourceChords : [...targetProg.chords];

      // Swap chords
      const sourceChord = sourceChords[sourceIdx];
      if (sourceProgId === targetProgId) {
        // Same progression - reorder
        sourceChords.splice(sourceIdx, 1);
        sourceChords.splice(targetIdx, 0, sourceChord);
      } else {
        // Different progressions - swap
        const targetChord = targetChords[targetIdx];
        sourceChords[sourceIdx] = targetChord;
        targetChords[targetIdx] = sourceChord;
      }

      // Update state
      const updateProgression = (prog: ChordProgression, newChords: typeof sourceChords) => ({
        ...prog,
        chords: newChords,
      });

      let newMain = state.mainProgression;
      let newBridges = [...state.bridgeProgressions];

      if (state.mainProgression.id === sourceProgId) {
        newMain = updateProgression(state.mainProgression, sourceChords);
      } else {
        const idx = newBridges.findIndex(p => p.id === sourceProgId);
        if (idx !== -1) newBridges[idx] = updateProgression(newBridges[idx], sourceChords);
      }

      if (sourceProgId !== targetProgId) {
        if (state.mainProgression.id === targetProgId) {
          newMain = updateProgression(state.mainProgression, targetChords);
        } else {
          const idx = newBridges.findIndex(p => p.id === targetProgId);
          if (idx !== -1) newBridges[idx] = updateProgression(newBridges[idx], targetChords);
        }
      }

      return {
        ...state,
        mainProgression: newMain,
        bridgeProgressions: newBridges,
      };
    }
    case 'INSERT_CHORD': {
      const { progressionId, insertIndex, newChord } = action.payload;

      // Find progression
      const findProgression = (id: string): ChordProgression | null => {
        if (state.mainProgression.id === id) return state.mainProgression;
        return state.bridgeProgressions.find(p => p.id === id) || null;
      };

      const prog = findProgression(progressionId);
      if (!prog || insertIndex <= 0 || insertIndex > prog.chords.length) return state;

      // Clone chords
      const newChords = [...prog.chords];

      // Halve the duration of the preceding chord
      if (insertIndex > 0) {
        newChords[insertIndex - 1] = {
          ...newChords[insertIndex - 1],
          durationBeats: Math.max(1, newChords[insertIndex - 1].durationBeats / 2),
        };
      }

      // Insert new chord
      newChords.splice(insertIndex, 0, newChord);

      // Update state
      if (state.mainProgression.id === progressionId) {
        return {
          ...state,
          mainProgression: { ...state.mainProgression, chords: newChords },
        };
      } else {
        const newBridges = state.bridgeProgressions.map(p =>
          p.id === progressionId ? { ...p, chords: newChords } : p
        );
        return {
          ...state,
          bridgeProgressions: newBridges,
        };
      }
    }
    case 'REGENERATE_SINGLE_CHORD': {
      const { progressionId, chordIndex, newChord } = action.payload;

      // Update main progression
      if (state.mainProgression.id === progressionId) {
        const newChords = [...state.mainProgression.chords];
        newChords[chordIndex] = newChord;
        return {
          ...state,
          mainProgression: { ...state.mainProgression, chords: newChords },
        };
      }

      // Update bridge progressions
      const newBridges = state.bridgeProgressions.map(p => {
        if (p.id === progressionId) {
          const newChords = [...p.chords];
          newChords[chordIndex] = newChord;
          return { ...p, chords: newChords };
        }
        return p;
      });
      return {
        ...state,
        bridgeProgressions: newBridges,
      };
    }
    case 'UPDATE_CHORD_DURATION': {
      const { progressionId, chordIndex, durationBeats } = action.payload;
      // 0.5〜8拍の範囲に制限
      const clampedDuration = Math.max(0.5, Math.min(8, durationBeats));

      // メイン進行の更新
      if (state.mainProgression.id === progressionId) {
        const newChords = [...state.mainProgression.chords];
        newChords[chordIndex] = { ...newChords[chordIndex], durationBeats: clampedDuration };
        return {
          ...state,
          mainProgression: { ...state.mainProgression, chords: newChords },
        };
      }

      // ブリッジ進行の更新
      const newBridges = state.bridgeProgressions.map(p => {
        if (p.id === progressionId) {
          const newChords = [...p.chords];
          newChords[chordIndex] = { ...newChords[chordIndex], durationBeats: clampedDuration };
          return { ...p, chords: newChords };
        }
        return p;
      });
      return {
        ...state,
        bridgeProgressions: newBridges,
      };
    }
    default:
      return state;
  }
}

export function useChordProgression() {
  const [state, dispatch] = useReducer(reducer, initialState);

  const setKey = useCallback((key: Key) => {
    dispatch({ type: 'SET_KEY', payload: key });
  }, []);

  const setTempo = useCallback((tempo: number) => {
    dispatch({ type: 'SET_TEMPO', payload: tempo });
  }, []);

  const setGenre = useCallback((genre: Genre) => {
    dispatch({ type: 'SET_GENRE', payload: genre });
  }, []);

  const setMood = useCallback((mood: Mood) => {
    dispatch({ type: 'SET_MOOD', payload: mood });
  }, []);

  const setSoundType = useCallback((soundType: SoundType) => {
    dispatch({ type: 'SET_SOUND_TYPE', payload: soundType });
  }, []);

  const generate = useCallback(() => {
    const { key, genre, mood } = state.settings;
    const progressions = generateProgressions(key, genre, mood);
    dispatch({ type: 'SET_PROGRESSIONS', payload: progressions });
  }, [state.settings]);

  const regenerateMain = useCallback(() => {
    dispatch({ type: 'REGENERATE_MAIN' });
  }, []);

  const regenerateBridge = useCallback((index: number) => {
    dispatch({ type: 'REGENERATE_BRIDGE', payload: index });
  }, []);

  const swapChord = useCallback((sourceProgId: string, targetProgId: string, sourceIdx: number, targetIdx: number) => {
    dispatch({
      type: 'SWAP_CHORD',
      payload: { sourceProgId, targetProgId, sourceIdx, targetIdx },
    });
  }, []);

  // Insert a passing chord between two existing chords
  const insertChord = useCallback((progressionId: string, insertIndex: number) => {
    const { key, genre } = state.settings;

    // Find the progression
    const prog = state.mainProgression.id === progressionId
      ? state.mainProgression
      : state.bridgeProgressions.find(p => p.id === progressionId);

    if (!prog || insertIndex <= 0 || insertIndex >= prog.chords.length) return;

    const prevChord = prog.chords[insertIndex - 1];
    const nextChord = prog.chords[insertIndex];

    // Generate passing chord
    const passingChord = generatePassingChord(prevChord, nextChord, key, genre);

    dispatch({
      type: 'INSERT_CHORD',
      payload: { progressionId, insertIndex, newChord: passingChord },
    });
  }, [state.settings, state.mainProgression, state.bridgeProgressions]);

  // Regenerate a single chord in a progression
  const regenerateSingleChord = useCallback((progressionId: string, chordIndex: number) => {
    const { key, genre } = state.settings;

    // Find the progression
    const prog = state.mainProgression.id === progressionId
      ? state.mainProgression
      : state.bridgeProgressions.find(p => p.id === progressionId);

    if (!prog || chordIndex < 0 || chordIndex >= prog.chords.length) return;

    const oldChord = prog.chords[chordIndex];
    const prevChord = chordIndex > 0 ? prog.chords[chordIndex - 1] : null;

    // Generate new chord with same duration but different voicing/quality
    const newChord = generateSingleChord(oldChord, prevChord, key, genre);

    dispatch({
      type: 'REGENERATE_SINGLE_CHORD',
      payload: { progressionId, chordIndex, newChord },
    });
  }, [state.settings, state.mainProgression, state.bridgeProgressions]);

  // Update duration of a single chord
  const updateChordDuration = useCallback((progressionId: string, chordIndex: number, durationBeats: number) => {
    dispatch({
      type: 'UPDATE_CHORD_DURATION',
      payload: { progressionId, chordIndex, durationBeats },
    });
  }, []);

  // Generate initial progressions on mount
  useEffect(() => {
    generate();
  }, []);

  return {
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
  };
}
