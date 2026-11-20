import { useCallback, useEffect, useMemo, useReducer, useState } from "react";
import { engine } from "./lib/audio";
import { exampleSong, blankSong, totalBeats } from "./lib/song";
import { degreeColor } from "./lib/colors";
import { exportJson, exportMidi, loadSaved, readSongFile, saveSong } from "./lib/files";
import { melodyMidi, type ChordSpec } from "./lib/theory";
import { initState, reducer, selectedChord, selectedNote, type Action, type Brush } from "./state";
import { Transport } from "./components/Transport";
import { Timeline } from "./components/Timeline";
import { ChordPalette } from "./components/ChordPalette";
import { MelodyPanel } from "./components/MelodyPanel";
import { SoundPanel } from "./components/SoundPanel";

const beatWidthFor = (w: number) => (w < 560 ? 40 : 52);

export default function App() {
  const [state, dispatch] = useReducer(reducer, undefined, () => initState(loadSaved() ?? exampleSong()));
  const [playing, setPlaying] = useState(false);
  const [beatWidth, setBeatWidth] = useState(() => beatWidthFor(window.innerWidth));
  const [error, setError] = useState<string | null>(null);
  const { song } = state;
  const chord = selectedChord(state);
  // Playback settings survive Clear and Example (undo doesn't restore them).
  const playback = { loop: song.loop, metronome: song.metronome, style: song.style, mix: song.mix };
  const note = selectedNote(state);

  // Autosave.
  useEffect(() => {
    const t = setTimeout(() => saveSong(song), 250);
    return () => clearTimeout(t);
  }, [song]);

  useEffect(() => engine.setMix(song.mix), [song.mix]);

  // Edits during playback are heard on the next pass. Only fields that change what's
  // scheduled trigger a reload; title edits and mixer moves don't.
  const { chords, notes, bpm, key, mode, bars, beatsPerBar, loop, metronome, style } = song;
  const scheduled = useMemo(
    () => ({ chords, notes, bpm, key, mode, bars, beatsPerBar, loop, metronome, style }),
    [chords, notes, bpm, key, mode, bars, beatsPerBar, loop, metronome, style],
  );
  useEffect(() => {
    if (playing) engine.load(scheduled);
  }, [scheduled, playing]);

  useEffect(() => {
    engine.onEnd = () => {
      engine.stop();
      setPlaying(false);
    };
    const onResize = () => setBeatWidth(beatWidthFor(window.innerWidth));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const previewChord = useCallback((c: ChordSpec) => {
    if (!engine.playing) void engine.previewChord(c, song.key, song.mode);
  }, [song.key, song.mode]);
  const previewStep = useCallback((step: number, acc = 0) => {
    if (!engine.playing) void engine.previewNote(melodyMidi(step, acc, song.key, song.mode));
  }, [song.key, song.mode]);

  const togglePlay = useCallback(async () => {
    if (engine.playing) {
      engine.stop();
      setPlaying(false);
    } else {
      await engine.play(song, state.playhead);
      setPlaying(true);
    }
  }, [song, state.playhead]);

  const placeChord = useCallback((degree: number) => {
    dispatch({ type: "placeChord", degree });
    previewChord({ degree, ...state.brush });
  }, [previewChord, state.brush]);

  const setBrush = (patch: Partial<Brush>) => {
    dispatch({ type: "setBrush", patch });
    if (chord) previewChord({ ...chord, ...state.brush, ...patch });
  };

  const setPlayhead = async (beat: number) => {
    dispatch({ type: "setPlayhead", beat });
    if (engine.playing) {
      engine.stop();
      await engine.play(song, beat);
    }
  };

  const replaceSong = (next: typeof song) => {
    engine.stop();
    setPlaying(false);
    dispatch({ type: "replaceSong", song: next });
  };

  // Keyboard shortcuts.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).matches("input, select, textarea")) return;
      const run = (a: Action) => { e.preventDefault(); dispatch(a); };
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") return run({ type: "undo" });
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === " ") { e.preventDefault(); void togglePlay(); return; }
      if (/^[1-7]$/.test(e.key)) { e.preventDefault(); placeChord(Number(e.key)); return; }
      if (e.key === "Delete" || e.key === "Backspace") return run({ type: "deleteSelected" });
      if (e.key === "Escape") return run({ type: "deselect" });
      const arrows: Record<string, [number, number]> = { ArrowUp: [1, 0], ArrowDown: [-1, 0], ArrowLeft: [0, -0.5], ArrowRight: [0, 0.5] };
      if (!(e.key in arrows)) return;
      if (note) {
        const [dStep, dBeat] = arrows[e.key];
        run({ type: "moveNote", dStep, dBeat });
        if (dStep) previewStep(note.step + dStep, note.acc);
      } else if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        run({ type: "setCursor", beat: state.cursor + (e.key === "ArrowLeft" ? -1 : 1) });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [togglePlay, placeChord, previewStep, note, state.cursor]);

  return (
    <div className="app">
      <header>
        <div className="brand">
          <span className="steps" aria-hidden>
            {[1, 2, 3, 4, 5].map((d, i) => <i key={d} style={{ height: 6 + i * 2.5, background: degreeColor(d) }} />)}
          </span>
          Stepwise
        </div>
        <input
          id="title" aria-label="Song title" value={song.title}
          onChange={(e) => dispatch({ type: "updateSong", patch: { title: e.target.value }, record: false })}
        />
        <div className="hint">
          <kbd>1</kbd>–<kbd>7</kbd> add chord · <kbd>Space</kbd> play · click the grid to add notes · <kbd>Del</kbd> remove
        </div>
      </header>

      <Transport
        song={song}
        playing={playing}
        canUndo={state.past.length > 0}
        onPlay={() => void togglePlay()}
        onUpdate={(patch, record) => dispatch({ type: "updateSong", patch, record })}
        onBars={(bars) => dispatch({ type: "setBars", bars })}
        onUndo={() => dispatch({ type: "undo" })}
        onExample={() => replaceSong({ ...exampleSong(), ...playback })}
        onClear={() => replaceSong(blankSong({ key: song.key, mode: song.mode, bpm: song.bpm, ...playback }))}
        onExportMidi={() => exportMidi(song)}
        onExportJson={() => exportJson(song)}
        onImport={async (f) => {
          try {
            replaceSong(await readSongFile(f));
            setError(null);
          } catch (err) {
            setError(err instanceof Error ? err.message : "Couldn't open that file.");
          }
        }}
      />
      {error && <div className="error" role="alert">{error}</div>}

      <Timeline
        song={song}
        sel={state.sel}
        cursor={state.cursor}
        playhead={state.playhead}
        playing={playing}
        beatWidth={beatWidth}
        onPlaceNote={(start, step) => {
          if (start >= totalBeats(song)) return;
          dispatch({ type: "placeNote", start, step });
          previewStep(step);
        }}
        onSelect={(kind, id) => {
          dispatch({ type: "select", kind, id });
          if (kind === "chord") {
            const c = song.chords.find((x) => x.id === id);
            if (c) previewChord(c);
          } else {
            const n = song.notes.find((x) => x.id === id);
            if (n) previewStep(n.step, n.acc);
          }
        }}
        onDelete={() => dispatch({ type: "deleteSelected" })}
        onSetCursor={(beat) => dispatch({ type: "setCursor", beat })}
        onSetPlayhead={(beat) => void setPlayhead(beat)}
        onPreviewStep={(s) => void engine.previewNote(melodyMidi(s, 0, song.key, song.mode))}
      />

      <div className="dock">
        <ChordPalette song={song} brush={state.brush} cursor={state.cursor} onPlace={placeChord} onBrush={setBrush} />
        <div className="side">
        <MelodyPanel
          song={song}
          noteDur={state.noteDur}
          chord={chord}
          note={note}
          onNoteDur={(dur) => dispatch({ type: "setNoteDur", dur })}
          onAccidental={(acc) => {
            dispatch({ type: "setAccidental", acc });
            if (note) previewStep(note.step, acc);
          }}
          onDelete={() => dispatch({ type: "deleteSelected" })}
        />
        <SoundPanel song={song} onUpdate={(patch, record) => dispatch({ type: "updateSong", patch, record })} />
        </div>
      </div>
    </div>
  );
}
