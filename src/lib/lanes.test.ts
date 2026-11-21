import { describe, expect, it } from "vitest";
import { fitBeatWidth, laneHits, nextZoom, pitchRange, pitchY, windowStart } from "./lanes";
import { blankSong, type Chord } from "./song";

const chord = (start: number, degree: number): Chord =>
  ({ id: `c${start}`, start, dur: 4, degree, type: "triad", inv: 0, borrowed: false, applied: 0 });

describe("fitting the loop to the screen", () => {
  it("fits every beat of an 8-bar loop into a phone's width", () => {
    // 375px phone, 8px gutters, 52px label column.
    const bw = fitBeatWidth(375 - 16 - 52, 32);
    expect(bw * 32).toBeCloseTo(307);
    expect(fitBeatWidth(307, 32, 2)).toBeCloseTo(bw * 2);
    expect(fitBeatWidth(0, 32)).toBe(0);
  });
  it("cycles zoom 1× → 2× → 4× → 1×", () => {
    expect([nextZoom(1), nextZoom(2), nextZoom(4)]).toEqual([2, 4, 1]);
  });
});

describe("lane contents", () => {
  const song = blankSong({ bars: 2, chords: [chord(0, 1), chord(4, 5)] });
  it("draws the arp as an eighth-note arpeggio of each chord, coloured by its chord", () => {
    const { arp } = laneHits(song);
    expect(arp).toHaveLength(16);
    expect(arp.slice(0, 4).map((h) => h.notes[0])).toEqual([48, 52, 55, 60]);
    expect(arp[8].degree).toBe(5);
  });
  it("draws the bass the song actually plays", () => {
    const { bass } = laneHits({ ...song, style: "pulse" });
    expect(bass.map((h) => [h.start, h.notes[0], h.degree])).toEqual([[0, 36, 1], [4, 43, 5]]);
  });
  it("maps pitches into a lane, padding narrow ranges", () => {
    expect(pitchRange([{ start: 0, dur: 1, notes: [40] }])).toEqual([38, 42]);
    expect(pitchRange([])).toEqual([0, 1]);
    expect(pitchY(48, [36, 60])).toBe(0.5);
  });
});

describe("melody editor window", () => {
  it("pages through the loop a window at a time and never runs past the end", () => {
    expect(windowStart(0, 2, 8)).toBe(0);
    expect(windowStart(3, 2, 8)).toBe(2);
    expect(windowStart(7, 2, 8)).toBe(6);
    expect(windowStart(4, 2, 5)).toBe(3);
    expect(windowStart(2, 1, 8)).toBe(2);
  });
});
