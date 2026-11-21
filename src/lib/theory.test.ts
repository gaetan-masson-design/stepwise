import { describe, expect, it } from "vitest";
import { analyzeChord, canTonicize, chordMidi, keyName, melodyMidi, spell, stepName, stepPitchName, tonicLetter } from "./theory";

const chord = (degree: number, extra: Partial<{ type: "triad" | "seventh" | "sus2" | "sus4" | "add9"; inv: number; borrowed: boolean; applied: number }> = {}) =>
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

describe("applied chords", () => {
  const fmt = (c: Parameters<typeof analyzeChord>[0], key = 0, mode: "major" | "minor" = "major") => {
    const a = analyzeChord(c, key, mode);
    return `${a.numeral}${a.sup}${a.target} ${a.name}`;
  };
  it("builds secondary dominants and leading-tone chords", () => {
    expect(fmt({ ...chord(5), applied: 5 })).toBe("V/V D");
    expect(fmt({ ...chord(5, { type: "seventh" }), applied: 2 })).toBe("V7/ii A7");
    expect(fmt({ ...chord(7, { type: "seventh" }), applied: 6 })).toBe("vii°7/vi G♯dim7");
    expect(fmt({ ...chord(5, { type: "seventh" }), applied: 4 })).toBe("V7/IV C7");
  });
  it("keeps applied chords in the normal register", () => {
    const { notes } = chordMidi({ ...chord(7), applied: 6 }, 0, "major");
    expect(Math.min(...notes)).toBeLessThan(60);
    expect(Math.min(...notes)).toBeGreaterThanOrEqual(48);
  });
  it("only tonicizes major and minor triads", () => {
    expect([2, 3, 4, 5, 6, 7].map((t) => canTonicize(t, "major"))).toEqual([true, true, true, true, true, false]);
    expect(canTonicize(2, "minor")).toBe(false);
  });
});

describe("note spelling", () => {
  const names = (key: number, mode: Parameters<typeof keyName>[1]) =>
    [0, 1, 2, 3, 4, 5, 6].map((s) => stepName(s, 0, key, mode)).join(" ");

  it("spells a pitch on a given letter", () => {
    expect(spell(4, 8)).toBe("G♯"); // G-letter, pitch class 8
    expect(spell(5, 8)).toBe("A♭");
    expect(spell(6, 0)).toBe("B♯");
    expect(spell(0, 11)).toBe("C♭");
    expect(spell(3, 7)).toBe("F𝄪");
  });

  it("names keys with the fewest accidentals for the mode", () => {
    expect(keyName(1, "major")).toBe("D♭");
    expect(keyName(1, "minor")).toBe("C♯");
    expect(keyName(8, "major")).toBe("A♭");
    expect(keyName(8, "minor")).toBe("G♯");
    expect(keyName(6, "major")).toBe("F♯");
    expect(keyName(3, "minor")).toBe("E♭");
    expect(keyName(10, "minor")).toBe("B♭");
    expect(keyName(1, "dorian")).toBe("C♯");
    expect(tonicLetter(0, "major")).toBe(0);
  });

  it("gives every scale degree its own letter", () => {
    expect(names(0, "major")).toBe("C D E F G A B");
    expect(names(4, "major")).toBe("E F♯ G♯ A B C♯ D♯");
    expect(names(1, "minor")).toBe("C♯ D♯ E F♯ G♯ A B");
    expect(names(6, "major")).toBe("F♯ G♯ A♯ B C♯ D♯ E♯");
    expect(names(5, "minor")).toBe("F G A♭ B♭ C D♭ E♭");
    expect(names(2, "dorian")).toBe("D E F G A B C");
    expect(names(4, "phrygian")).toBe("E F G A B C D");
  });

  it("spells altered melody notes on their degree's letter", () => {
    expect(stepName(4, 1, 0, "major")).toBe("G♯");
    expect(stepName(5, -1, 0, "major")).toBe("A♭");
    expect(stepName(6, 1, 9, "minor")).toBe("G♯"); // raised 7th in A minor
    expect(stepPitchName(0, 0, 0, "major")).toBe("C4");
    expect(stepPitchName(-1, 0, 0, "major")).toBe("B3");
    // B♯ sounds like C but is written in the octave below.
    expect(stepPitchName(6, 1, 0, "major")).toBe("B♯4");
  });

  it("spells chords for the key and the chord", () => {
    const name = (c: Parameters<typeof analyzeChord>[0], key: number, mode: Parameters<typeof keyName>[1]) => analyzeChord(c, key, mode).name;
    // Applied chords use the target's letters.
    expect(name({ ...chord(7, { type: "seventh" }), applied: 6 }, 0, "major")).toBe("G♯dim7");
    expect(name({ ...chord(5), applied: 6 }, 0, "major")).toBe("E");
    expect(name({ ...chord(5, { type: "seventh" }), applied: 2 }, 0, "major")).toBe("A7");
    expect(name({ ...chord(5), applied: 5 }, 4, "major")).toBe("F♯");
    // Sharp keys get sharps, flat keys flats.
    expect(name(chord(3), 4, "major")).toBe("G♯m");
    expect(name(chord(4), 1, "minor")).toBe("F♯m");
    expect(name(chord(6), 1, "minor")).toBe("A");
    expect(name(chord(7), 6, "major")).toBe("E♯dim");
    expect(name(chord(2), 3, "major")).toBe("Fm");
    // Borrowed chords keep their degree letter: ♭VI in E major is C, ♭III is G.
    expect(name(chord(6, { borrowed: true }), 4, "major")).toBe("C");
    expect(name(chord(3, { borrowed: true }), 4, "major")).toBe("G");
    // The major V in a minor key is E with G♯, in A minor.
    expect(name(chord(5, { borrowed: true }), 9, "minor")).toBe("E");
    expect(analyzeChord({ ...chord(5), applied: 6 }, 0, "major").noteNames).toEqual(["E", "G♯", "B"]);
  });

  it("spells slash bass notes and chord tones", () => {
    const a = analyzeChord(chord(3, { inv: 1 }), 4, "major");
    expect(a.name).toBe("G♯m/B");
    const v7 = analyzeChord({ ...chord(5, { type: "seventh", inv: 1 }), applied: 6 }, 0, "major");
    expect(v7.name).toBe("E7/G♯");
    expect(v7.noteNames).toEqual(["G♯", "B", "D", "E"]);
    const add9 = analyzeChord(chord(1, { type: "add9" }), 1, "minor");
    expect(add9.noteNames).toEqual(["C♯", "E", "G♯", "D♯"]);
  });
});
