import { describe, expect, it } from "vitest";
import { blankSong } from "./lib/song";
import { initState, reducer, type Action, type EditorState } from "./state";

const run = (s: EditorState, ...actions: Action[]) => actions.reduce(reducer, s);

describe("editor reducer", () => {
  it("carries applied targets from the brush", () => {
    const s = run(initState(blankSong()), { type: "setBrush", patch: { applied: 5 } }, { type: "placeChord", degree: 5 });
    expect(s.song.chords.at(-1)!.applied).toBe(5);
  });

  it("drops an applied target the mode no longer allows", () => {
    let s = run(initState(blankSong()), { type: "setBrush", patch: { applied: 2 } });
    expect(s.brush.applied).toBe(2);
    s = run(s, { type: "updateSong", patch: { mode: "minor" } });
    expect(s.brush.applied).toBe(0);
  });

  it("does not load an invalid applied target when selecting a chord", () => {
    let s = run(initState(blankSong()), { type: "setBrush", patch: { applied: 2 } }, { type: "placeChord", degree: 5 });
    const id = s.song.chords[0].id;
    s = run(s, { type: "updateSong", patch: { mode: "minor" } }, { type: "select", kind: "chord", id });
    expect(s.brush.applied).toBe(0);
  });
});
