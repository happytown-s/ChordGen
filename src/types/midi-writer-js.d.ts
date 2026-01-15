declare module 'midi-writer-js' {
  export class Track {
    setTempo(tempo: number): void;
    addEvent(event: NoteEvent | NoteEvent[]): void;
  }

  export class NoteEvent {
    constructor(options: {
      pitch: number | number[] | string | string[];
      duration: string;
      velocity?: number;
      wait?: string;
      channel?: number;
    });
  }

  export class Writer {
    constructor(tracks: Track[]);
    dataUri(): string;
    buildFile(): Uint8Array;
  }

  const MidiWriter: {
    Track: typeof Track;
    NoteEvent: typeof NoteEvent;
    Writer: typeof Writer;
  };

  export default MidiWriter;
}
