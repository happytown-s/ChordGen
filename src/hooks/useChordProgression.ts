import { useReducer, useCallback, useEffect } from 'react';
import type { AppState, AppAction, Key, Genre, Mood, SoundType, ChordProgression } from '../types';
import { generateProgressions, regenerateProgression } from '../utils/chordGenerator';

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
  };
}
