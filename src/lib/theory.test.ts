import { describe, expect, it } from "vitest";
import { analyzeChord, chordMidi, melodyMidi } from "./theory";

const chord = (degree: number, extra: Partial<{ type: "triad" | "seventh" | "sus4" | "add9"; inv: number; borrowed: boolean }> = {}) =>
  ({ degree, type: "triad" as const, inv: 0, borrowed: false, ...extra });

describe("analyzeChord", () => {
  it("names the diatonic triads of C major", () => {
    const got = [1, 2, 3, 4, 5, 6, 7].map((d) => {
      const a = analyzeChord(chord(d), 0, "major");
      return `${a.numeral}${a.sup} ${a.name}`;
    });
    expect(got).toEqual(["I C", "ii Dm", "iii Em", "IV F", "V G", "vi Am", "vii° Bdim"]);
  });

  it("handles sevenths and inversions", () => {
    const v7 = analyzeChord(chord(5, { type: "seventh", inv: 1 }), 0, "major");
    expect(`${v7.numeral}${v7.sup}`).toBe("V6/5");
    expect(v7.name).toBe("G7/B");
    const imaj7 = analyzeChord(chord(1, { type: "seventh" }), 0, "major");
    expect(imaj7.sup).toBe("Δ7");
    expect(imaj7.name).toBe("Cmaj7");
    const half = analyzeChord(chord(7, { type: "seventh" }), 0, "major");
    expect(half.sup).toBe("ø7");
  });

  it("marks borrowed chords with accidentals", () => {
    const bVI = analyzeChord(chord(6, { borrowed: true }), 0, "major");
    expect(bVI.numeral).toBe("♭VI");
    expect(bVI.name).toBe("A♭");
    const iv = analyzeChord(chord(4, { borrowed: true }), 0, "major");
    expect(iv.numeral).toBe("iv");
  });

  it("uses the minor scale without accidentals in minor keys", () => {
    const III = analyzeChord(chord(3), 9, "minor");
    expect(III.numeral).toBe("III");
    expect(III.name).toBe("C");
  });

  it("transposes chord names with the key", () => {
    expect(analyzeChord(chord(5), 2, "major").name).toBe("A");
    expect(analyzeChord(chord(4, { type: "sus4" }), 7, "major").name).toBe("Csus4");
  });
});

describe("pitches", () => {
  it("voices chords around C3 and melody around C4", () => {
    expect(chordMidi(chord(1), 0, "major")).toEqual({ notes: [48, 52, 55], bass: 36 });
    expect(chordMidi(chord(1, { inv: 1 }), 0, "major").bass).toBe(40);
    expect(melodyMidi(0, 0, 0, "major")).toBe(60);
    expect(melodyMidi(7, 0, 0, "major")).toBe(72);
    expect(melodyMidi(-1, 0, 0, "major")).toBe(59);
    expect(melodyMidi(2, -1, 0, "major")).toBe(63);
  });
});
