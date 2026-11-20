import { chordMidi } from "./theory";
import type { Arrangement } from "./song";

export type PlayStyle = "block" | "pulse" | "arpeggio";

export const STYLE_LABEL: Record<PlayStyle, string> = {
  block: "Block",
  pulse: "Pulse",
  arpeggio: "Arpeggio",
};

export interface Mix {
  chords: number; // 0..1
  bass: number;
  melody: number;
}

export const DEFAULT_MIX: Mix = { chords: 0.8, bass: 0.8, melody: 0.8 };

/** A sounding event, in beats. */
export interface Hit {
  start: number;
  dur: number;
  notes: number[];
}

/** Subdivision for pulse and arpeggio, in beats (eighth notes). */
const SUB = 0.5;

/**
 * Turns the chord track into what the accompaniment actually plays, so playback and
 * MIDI export agree. Pulse repeats the chord on every eighth; arpeggio walks the chord
 * tones up and back down, adding the root an octave up.
 */
export function arrangeChords(song: Arrangement): { pad: Hit[]; bass: Hit[] } {
  const pad: Hit[] = [];
  const bass: Hit[] = [];
  const style = song.style ?? "block";
  for (const c of song.chords) {
    const { notes, bass: b } = chordMidi(c, song.key, song.mode);
    bass.push({ start: c.start, dur: c.dur, notes: [b] });
    if (style === "block") {
      pad.push({ start: c.start, dur: c.dur, notes });
      continue;
    }
    const tones = [...notes, notes[0] + 12];
    const walk = [...tones, ...tones.slice(1, -1).reverse()];
    const n = Math.max(1, Math.round(c.dur / SUB));
    for (let i = 0; i < n; i++) {
      const start = c.start + i * SUB;
      const dur = Math.min(SUB, c.start + c.dur - start);
      if (dur <= 0) break;
      pad.push({ start, dur: style === "pulse" ? dur * 0.8 : dur, notes: style === "pulse" ? notes : [walk[i % walk.length]] });
    }
  }
  return { pad, bass };
}
