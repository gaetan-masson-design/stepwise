import { arrangeChords, type Hit } from "./arrange";
import { BOTTOM_STEP, TOP_STEP, type Arrangement, type Chord } from "./song";

/** The four layers of a loop, top to bottom. */
export type Layer = "pads" | "arp" | "bass" | "melody";
export const LAYERS: Layer[] = ["pads", "arp", "bass", "melody"];
export const LAYER_LABEL: Record<Layer, string> = { pads: "Pads", arp: "Arp", bass: "Bass", melody: "Melody" };

/**
 * Pixels per beat so the whole loop fits `width` at zoom 1. Zooming multiplies it (the lanes
 * then scroll sideways inside the loop view, never the page).
 */
export const fitBeatWidth = (width: number, beats: number, zoom = 1) =>
  beats > 0 && width > 0 ? (width / beats) * zoom : 0;

export const ZOOMS = [1, 2, 4] as const;
export const nextZoom = (z: number) => ZOOMS[(ZOOMS.indexOf(z as (typeof ZOOMS)[number]) + 1) % ZOOMS.length];

/** A note drawn in a read-only lane, with the degree of the chord it belongs to (for its colour). */
export interface LaneHit extends Hit { degree: number }

const withDegree = (hits: Hit[], chords: Chord[]): LaneHit[] =>
  hits.map((h) => ({ ...h, degree: chords.find((c) => h.start >= c.start && h.start < c.start + c.dur)?.degree ?? 1 }));

/**
 * What the Arp and Bass lanes draw. The arp is the arpeggio the chords would play (Phase 1 gives
 * it its own layer); the bass is what plays now.
 */
export function laneHits(song: Arrangement) {
  const arp = arrangeChords({ ...song, style: "arpeggio" }).pad;
  const { bass } = arrangeChords(song);
  return { arp: withDegree(arp, song.chords), bass: withDegree(bass, song.chords) };
}

/** Lowest and highest pitch in a set of hits, padded so a flat line still has some height. */
export function pitchRange(hits: Hit[]): [number, number] {
  const notes = hits.flatMap((h) => h.notes);
  if (!notes.length) return [0, 1];
  const lo = Math.min(...notes), hi = Math.max(...notes);
  return hi - lo < 4 ? [lo - 2, hi + 2] : [lo, hi];
}

/** Fraction from the top (0) to the bottom (1) of a lane for a pitch in [lo, hi]. */
export const pitchY = (pitch: number, [lo, hi]: [number, number]) => (hi - pitch) / (hi - lo || 1);

/** Same for a melody step, over the melody's full range. */
export const stepY = (step: number) => (TOP_STEP - step) / (TOP_STEP - BOTTOM_STEP);

/** The first bar of the melody editor's window that shows `bar`, for windows of `size` bars. */
export const windowStart = (bar: number, size: number, bars: number) =>
  Math.max(0, Math.min(Math.floor(bar / size) * size, Math.max(0, bars - size)));
