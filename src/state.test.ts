import { describe, expect, it } from "vitest";
import { blankSong } from "./lib/song";
import { initState, reducer, type Action, type EditorState } from "./state";

const run = (s: EditorState, ...actions: Action[]) => actions.reduce(reducer, s);

describe("editor reducer", () => {
  it("undoes and redoes", () => {
    const s = run(initState(blankSong()), { type: "setCursor", beat: 0 }, { type: "placeChord", degree: 1 }, { type: "placeChord", degree: 5 });
    const undone = run(s, { type: "undo" });
    expect(undone.song.chords).toHaveLength(1);
    const redone = run(undone, { type: "redo" });
    expect(redone.song.chords.map((c) => c.degree)).toEqual([1, 5]);
    // A new edit clears redo.
    expect(run(undone, { type: "placeChord", degree: 4 }).future).toHaveLength(0);
  });

  it("moves and resizes notes in one undo step", () => {
    let s = run(initState(blankSong()), { type: "placeNote", start: 0, step: 2 });
    const id = s.song.notes[0].id;
    s = run(s, { type: "editItem", kind: "note", id, start: 2, dur: 1.5, step: 4 });
    expect(s.song.notes[0]).toMatchObject({ start: 2, dur: 1.5, step: 4 });
    expect(run(s, { type: "undo" }).song.notes[0]).toMatchObject({ start: 0, step: 2 });
  });

  it("trims neighbours when a chord is stretched over them", () => {
    let s = run(initState(blankSong()), { type: "setCursor", beat: 0 }, { type: "placeChord", degree: 1 }, { type: "placeChord", degree: 4 });
    const [first] = s.song.chords;
    s = run(s, { type: "editItem", kind: "chord", id: first.id, start: 0, dur: 6 });
    expect(s.song.chords.map((c) => [c.degree, c.start, c.dur])).toEqual([[1, 0, 6], [4, 6, 2]]);
  });

  it("duplicates the selection right after itself", () => {
    let s = run(initState(blankSong()), { type: "setCursor", beat: 0 }, { type: "placeChord", degree: 6 });
    s = run(s, { type: "duplicate" });
    expect(s.song.chords.map((c) => [c.degree, c.start])).toEqual([[6, 0], [6, 4]]);
    expect(s.sel?.id).toBe(s.song.chords[1].id);
  });

  it("carries applied targets from the brush", () => {
    const s = run(initState(blankSong()), { type: "setBrush", patch: { applied: 5 } }, { type: "placeChord", degree: 5 });
    expect(s.song.chords.at(-1)!.applied).toBe(5);
  });

  it("keeps playback settings through undo and redo", () => {
    let s = run(initState(blankSong()), { type: "placeChord", degree: 1 });
    s = run(s, { type: "updateSong", patch: { style: "arpeggio", mix: { chords: 1, bass: 0, melody: 0.5 } }, record: false });
    const undone = run(s, { type: "undo" });
    expect(undone.song.chords).toHaveLength(0);
    expect(undone.song.style).toBe("arpeggio");
    expect(undone.song.mix.bass).toBe(0);
    expect(run(undone, { type: "redo" }).song.style).toBe("arpeggio");
  });

  it("never duplicates or places past the maximum length", () => {
    let s = run(initState(blankSong({ bars: 64 })), { type: "setCursor", beat: 252 }, { type: "setBrush", patch: { dur: 8 } }, { type: "placeChord", degree: 1 });
    expect(s.song.chords[0]).toMatchObject({ start: 252, dur: 4 });
    s = run(initState(blankSong({ bars: 64 })), { type: "setCursor", beat: 248 }, { type: "placeChord", degree: 1 });
    s = run(s, { type: "setBrush", patch: { dur: 8 } }, { type: "setCursor", beat: 244 }, { type: "placeChord", degree: 4 }, { type: "duplicate" });
    for (const c of s.song.chords) expect(c.start + c.dur).toBeLessThanOrEqual(256);
  });

  it("drops an applied target the mode no longer allows", () => {
    let s = run(initState(blankSong()), { type: "setBrush", patch: { applied: 2 } });
    expect(s.brush.applied).toBe(2);
    s = run(s, { type: "updateSong", patch: { mode: "minor" } });
    expect(s.brush.applied).toBe(0);
  });

  it("caps history on redo", () => {
    let s = initState(blankSong());
    for (let i = 0; i < 120; i++) s = run(s, { type: "placeNote", start: (i % 16) * 2, step: i % 7 });
    s = run(s, { type: "undo" }, { type: "redo" });
    expect(s.past.length).toBeLessThanOrEqual(100);
  });

  it("does not load an invalid applied target when selecting a chord", () => {
    let s = run(initState(blankSong()), { type: "setBrush", patch: { applied: 2 } }, { type: "placeChord", degree: 5 });
    const id = s.song.chords[0].id;
    s = run(s, { type: "updateSong", patch: { mode: "minor" } }, { type: "select", kind: "chord", id });
    expect(s.brush.applied).toBe(0);
  });
});
