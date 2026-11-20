import type { ChordType, Mode } from "./theory";

export interface Chord {
  id: string;
  start: number; // beats
  dur: number; // beats
  degree: number; // 1..7
  type: ChordType;
  inv: number;
  borrowed: boolean;
}

export interface Note {
  id: string;
  start: number; // beats
  dur: number; // beats
  step: number; // diatonic step from the tonic (0 = degree 1)
  acc: number; // -1, 0, 1
}

export interface Song {
  title: string;
  key: number; // 0..11, C = 0
  mode: Mode;
  bpm: number;
  beatsPerBar: number;
  bars: number;
  loop: boolean;
  metronome: boolean;
  chords: Chord[];
  notes: Note[];
}

/** Melody grid range, in diatonic steps from the tonic. */
export const TOP_STEP = 14;
export const BOTTOM_STEP = -3;
export const MAX_BARS = 64;

let counter = 0;
export const newId = () => `${Date.now().toString(36)}-${(counter++).toString(36)}`;

export const totalBeats = (s: Song) => s.bars * s.beatsPerBar;

export function blankSong(from?: Partial<Song>): Song {
  return {
    title: "Untitled sketch",
    key: 0,
    mode: "major",
    bpm: 96,
    beatsPerBar: 4,
    bars: 8,
    loop: true,
    metronome: false,
    chords: [],
    notes: [],
    ...from,
  };
}

export function exampleSong(): Song {
  const chords: [number, ChordType, number][] = [
    [1, "triad", 0], [5, "triad", 1], [6, "triad", 0], [4, "triad", 0],
    [1, "triad", 0], [5, "triad", 0], [4, "triad", 0], [5, "seventh", 0],
  ];
  const notes: [number, number, number][] = [
    [0, 1, 4], [1, 0.5, 2], [1.5, 0.5, 3], [2, 1, 4], [3, 1, 7], [4, 1.5, 6], [5.5, 0.5, 4], [6, 2, 1],
    [8, 1, 0], [9, 0.5, 2], [9.5, 0.5, 0], [10, 1, 5], [11, 1, 4], [12, 1, 3], [13, 1, 5], [14, 2, 7],
    [16, 1, 4], [17, 0.5, 2], [17.5, 0.5, 3], [18, 1, 4], [19, 1, 9], [20, 1.5, 8], [21.5, 0.5, 6], [22, 2, 4],
    [24, 1, 5], [25, 1, 7], [26, 1, 8], [27, 1, 7], [28, 1, 6], [29, 1, 4], [30, 2, 8],
  ];
  return blankSong({
    title: "Lantern song (example)",
    chords: chords.map(([degree, type, inv], i) => ({ id: newId(), start: i * 4, dur: 4, degree, type, inv, borrowed: false })),
    notes: notes.map(([start, dur, step]) => ({ id: newId(), start, dur, step, acc: 0 })),
  });
}

interface Span { id: string; start: number; dur: number }

/**
 * Makes room for [start, end) by trimming or removing overlapping items.
 * Returns a new array; the item with `exceptId` is left untouched.
 */
export function clearRange<T extends Span>(items: T[], start: number, end: number, exceptId?: string): T[] {
  const out: T[] = [];
  for (const x of items) {
    const xEnd = x.start + x.dur;
    if (x.id === exceptId || xEnd <= start || x.start >= end) out.push(x);
    else if (x.start < start) out.push({ ...x, dur: start - x.start });
    else if (xEnd > end) out.push({ ...x, start: end, dur: xEnd - end });
    // fully covered: dropped
  }
  return out;
}

export const byStart = <T extends Span>(a: T, b: T) => a.start - b.start;

/** Grows the song so that `end` (in beats) fits. */
export const barsToFit = (s: Song, end: number) =>
  Math.min(MAX_BARS, Math.max(s.bars, Math.ceil(end / s.beatsPerBar)));

/** Shrinks or grows to `bars`, trimming anything past the new end. */
export function resizeSong(s: Song, bars: number): Song {
  bars = Math.max(1, Math.min(MAX_BARS, bars));
  const end = bars * s.beatsPerBar;
  const fit = <T extends Span>(arr: T[]) =>
    arr.filter((x) => x.start < end).map((x) => (x.start + x.dur > end ? { ...x, dur: end - x.start } : x));
  return { ...s, bars, chords: fit(s.chords), notes: fit(s.notes) };
}

export function isSong(v: unknown): v is Song {
  const s = v as Song;
  return !!s && typeof s === "object" && Array.isArray(s.chords) && Array.isArray(s.notes) && typeof s.bpm === "number";
}

/** Adds ids to songs saved without them (e.g. the first prototype). */
export function normalizeSong(s: Song): Song {
  return {
    ...blankSong(),
    ...s,
    beatsPerBar: s.beatsPerBar ?? (s as unknown as { bpb?: number }).bpb ?? 4,
    metronome: s.metronome ?? (s as unknown as { metro?: boolean }).metro ?? false,
    chords: s.chords.map((c) => ({ ...c, id: c.id ?? newId() })),
    notes: s.notes.map((n) => ({ ...n, id: n.id ?? newId() })),
  };
}
