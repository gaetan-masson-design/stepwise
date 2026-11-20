import { describe, expect, it } from "vitest";
import { blankSong, clearRange, exampleSong, normalizeSong, resizeSong } from "./song";
import { songToMidi } from "./midi";

const span = (id: string, start: number, dur: number) => ({ id, start, dur });

describe("clearRange", () => {
  it("trims, shifts, and removes overlapping items", () => {
    const items = [span("a", 0, 4), span("b", 4, 2), span("c", 6, 4), span("d", 12, 1)];
    expect(clearRange(items, 3, 8)).toEqual([span("a", 0, 3), span("c", 8, 2), span("d", 12, 1)]);
  });
  it("keeps the excepted item", () => {
    expect(clearRange([span("a", 0, 4)], 0, 4, "a")).toEqual([span("a", 0, 4)]);
  });
});

describe("resizeSong", () => {
  it("trims content past the new end", () => {
    const s = resizeSong(exampleSong(), 2);
    expect(s.bars).toBe(2);
    expect(s.chords).toHaveLength(2);
    expect(Math.max(...s.notes.map((n) => n.start + n.dur))).toBeLessThanOrEqual(8);
  });
});

describe("normalizeSong", () => {
  it("upgrades songs saved by the prototype", () => {
    const old = { ...blankSong(), bpb: 3, metro: true, chords: [{ start: 0, dur: 4, degree: 1, type: "triad", inv: 0, borrowed: false }], notes: [] };
    delete (old as Partial<typeof old>).beatsPerBar;
    delete (old as Partial<typeof old>).metronome;
    const s = normalizeSong(old as never);
    expect(s.beatsPerBar).toBe(3);
    expect(s.metronome).toBe(true);
    expect(s.chords[0].id).toBeTruthy();
  });
});

describe("songToMidi", () => {
  it("writes a type-1 file with a tempo track and three instrument tracks", () => {
    const bytes = songToMidi(exampleSong());
    const text = (i: number, n: number) => String.fromCharCode(...bytes.slice(i, i + n));
    expect(text(0, 4)).toBe("MThd");
    expect(bytes[9]).toBe(1); // format 1
    expect(bytes[11]).toBe(4); // 4 tracks
    expect(text(14, 4)).toBe("MTrk");
    let count = 0;
    for (let i = 0; i < bytes.length - 3; i++) if (text(i, 4) === "MTrk") count++;
    expect(count).toBe(4);
  });
});
