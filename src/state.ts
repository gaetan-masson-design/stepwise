import {
  barsToFit, BOTTOM_STEP, byStart, clearRange, newId, resizeSong, TOP_STEP, totalBeats,
  type Chord, type Note, type Song,
} from "./lib/song";
import { canTonicize, maxInversion, type ChordType, type Mode } from "./lib/theory";

export interface Brush {
  type: ChordType;
  inv: number;
  borrowed: boolean;
  applied: number;
  dur: number;
}

export type Selection = { kind: "chord" | "note"; id: string } | null;

export interface EditorState {
  song: Song;
  past: Song[];
  sel: Selection;
  /** Where the next chord goes, in beats. */
  cursor: number;
  brush: Brush;
  noteDur: number;
  /** Where playback starts, in beats. */
  playhead: number;
}

export type Action =
  | { type: "placeChord"; degree: number }
  | { type: "placeNote"; start: number; step: number }
  | { type: "select"; kind: "chord" | "note"; id: string }
  | { type: "deselect" }
  | { type: "deleteSelected" }
  | { type: "setBrush"; patch: Partial<Brush> }
  | { type: "setNoteDur"; dur: number }
  | { type: "setAccidental"; acc: number }
  | { type: "moveNote"; dStep: number; dBeat: number }
  | { type: "setCursor"; beat: number }
  | { type: "setBars"; bars: number }
  | { type: "updateSong"; patch: Partial<Song>; record?: boolean }
  | { type: "replaceSong"; song: Song }
  | { type: "setPlayhead"; beat: number }
  | { type: "undo" };

const HISTORY = 100;

export function initState(song: Song): EditorState {
  return {
    song,
    past: [],
    sel: null,
    cursor: totalBeats(song),
    brush: { type: "triad", inv: 0, borrowed: false, applied: 0, dur: 4 },
    noteDur: 1,
    playhead: 0,
  };
}

/** Applies a song change and records the old song for undo. */
function commit(s: EditorState, song: Song, extra: Partial<EditorState> = {}): EditorState {
  return { ...s, ...extra, song, past: [...s.past.slice(-(HISTORY - 1)), s.song] };
}

/** Drops an applied target that the mode (or Borrowed) no longer allows. */
const validBrush = (b: Brush, mode: Mode): Brush =>
  b.applied && !canTonicize(b.applied, mode, b.borrowed) ? { ...b, applied: 0 } : b;

export const selectedChord = (s: EditorState): Chord | undefined =>
  s.sel?.kind === "chord" ? s.song.chords.find((c) => c.id === s.sel!.id) : undefined;
export const selectedNote = (s: EditorState): Note | undefined =>
  s.sel?.kind === "note" ? s.song.notes.find((n) => n.id === s.sel!.id) : undefined;

export function reducer(s: EditorState, a: Action): EditorState {
  const { song } = s;
  switch (a.type) {
    case "placeChord": {
      const { type, inv, borrowed, applied, dur } = s.brush;
      const c: Chord = { id: newId(), start: s.cursor, dur, degree: a.degree, type, inv, borrowed, applied };
      const bars = barsToFit(song, c.start + c.dur);
      if (c.start >= bars * song.beatsPerBar) return s; // song is at max length
      const chords = [...clearRange(song.chords, c.start, c.start + c.dur), c].sort(byStart);
      return commit(s, { ...song, bars, chords }, { sel: { kind: "chord", id: c.id }, cursor: c.start + c.dur });
    }
    case "placeNote": {
      const n: Note = { id: newId(), start: a.start, dur: s.noteDur, step: a.step, acc: 0 };
      const bars = barsToFit(song, n.start + n.dur);
      const notes = [...clearRange(song.notes, n.start, n.start + n.dur), n].sort(byStart);
      return commit(s, { ...song, bars, notes }, { sel: { kind: "note", id: n.id } });
    }
    case "select": {
      if (a.kind === "chord") {
        const c = song.chords.find((x) => x.id === a.id);
        if (!c) return s;
        return { ...s, sel: { kind: "chord", id: c.id }, cursor: c.start,
          brush: validBrush({ type: c.type, inv: c.inv, borrowed: c.borrowed, applied: c.applied, dur: c.dur }, song.mode) };
      }
      const n = song.notes.find((x) => x.id === a.id);
      if (!n) return s;
      return { ...s, sel: { kind: "note", id: n.id }, noteDur: n.dur };
    }
    case "deselect":
      return { ...s, sel: null };
    case "deleteSelected": {
      if (!s.sel) return s;
      const c = selectedChord(s);
      const next = c
        ? { ...song, chords: song.chords.filter((x) => x.id !== c.id) }
        : { ...song, notes: song.notes.filter((x) => x.id !== s.sel!.id) };
      return commit(s, next, { sel: null, cursor: c ? c.start : s.cursor });
    }
    case "setBrush": {
      const brush = validBrush({ ...s.brush, ...a.patch }, song.mode);
      brush.inv = Math.min(brush.inv, maxInversion(brush.type));
      const c = selectedChord(s);
      if (!c) return { ...s, brush };
      const updated: Chord = { ...c, type: brush.type, inv: brush.inv, borrowed: brush.borrowed, applied: brush.applied, dur: brush.dur };
      const bars = barsToFit(song, updated.start + updated.dur);
      const chords = clearRange(song.chords, updated.start, updated.start + updated.dur, c.id)
        .map((x) => (x.id === c.id ? updated : x));
      return commit(s, { ...song, bars, chords }, { brush, cursor: "dur" in a.patch ? updated.start + updated.dur : s.cursor });
    }
    case "setNoteDur": {
      const n = selectedNote(s);
      if (!n) return { ...s, noteDur: a.dur };
      const updated = { ...n, dur: a.dur };
      const bars = barsToFit(song, n.start + a.dur);
      const notes = clearRange(song.notes, n.start, n.start + a.dur, n.id).map((x) => (x.id === n.id ? updated : x));
      return commit(s, { ...song, bars, notes }, { noteDur: a.dur });
    }
    case "setAccidental": {
      const n = selectedNote(s);
      if (!n) return s;
      return commit(s, { ...song, notes: song.notes.map((x) => (x.id === n.id ? { ...x, acc: a.acc } : x)) });
    }
    case "moveNote": {
      const n = selectedNote(s);
      if (!n) return s;
      const step = Math.max(BOTTOM_STEP, Math.min(TOP_STEP, n.step + a.dStep));
      const start = Math.max(0, Math.min(totalBeats(song) - n.dur, n.start + a.dBeat));
      const updated = { ...n, step, start };
      const notes = clearRange(song.notes, start, start + n.dur, n.id)
        .map((x) => (x.id === n.id ? updated : x)).sort(byStart);
      return commit(s, { ...song, notes });
    }
    case "setCursor":
      return { ...s, sel: null, cursor: Math.max(0, Math.min(totalBeats(song), a.beat)) };
    case "setBars": {
      const next = resizeSong(song, a.bars);
      const end = totalBeats(next);
      return commit(s, next, { sel: null, cursor: Math.min(s.cursor, end), playhead: s.playhead >= end ? 0 : s.playhead });
    }
    case "updateSong": {
      const next = { ...song, ...a.patch };
      const brush = validBrush(s.brush, next.mode);
      return a.record === false ? { ...s, song: next, brush } : commit(s, next, { brush });
    }
    case "replaceSong":
      return commit(s, a.song, { sel: null, cursor: totalBeats(a.song), playhead: 0, brush: validBrush(s.brush, a.song.mode) });
    case "setPlayhead":
      return { ...s, playhead: a.beat };
    case "undo": {
      if (!s.past.length) return s;
      const prev = s.past[s.past.length - 1];
      return { ...s, song: prev, past: s.past.slice(0, -1), sel: null, cursor: Math.min(s.cursor, totalBeats(prev)) };
    }
  }
}
