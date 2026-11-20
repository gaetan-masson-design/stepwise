import { describe, expect, it } from "vitest";
import { arrangeChords } from "./arrange";
import { blankSong } from "./song";

const song = (style: "block" | "pulse" | "arpeggio") =>
  blankSong({ style, chords: [{ id: "a", start: 0, dur: 2, degree: 1, type: "triad", inv: 0, borrowed: false, applied: 0 }] });

describe("arrangeChords", () => {
  it("holds block chords for their full length", () => {
    expect(arrangeChords(song("block")).pad).toEqual([{ start: 0, dur: 2, notes: [48, 52, 55] }]);
  });
  it("repeats pulse chords every eighth", () => {
    const { pad, bass } = arrangeChords(song("pulse"));
    expect(pad.map((h) => h.start)).toEqual([0, 0.5, 1, 1.5]);
    expect(bass).toEqual([{ start: 0, dur: 2, notes: [36] }]);
  });
  it("walks arpeggios up and back down", () => {
    expect(arrangeChords(song("arpeggio")).pad.map((h) => h.notes[0])).toEqual([48, 52, 55, 60]);
  });
});
