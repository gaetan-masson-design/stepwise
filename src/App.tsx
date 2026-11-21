import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { engine } from "./lib/audio";
import { exampleSong, blankSong, totalBeats } from "./lib/song";
import { exportJson, exportMidi, loadSaved, readSongFile, saveSong } from "./lib/files";
import { melodyMidi, type ChordSpec } from "./lib/theory";
import { applyTheme, loadTheme, watchSystemTheme, type ThemeChoice } from "./lib/theme";
import { isIOS, preferPlaybackAudio, unlockOnGesture } from "./lib/device";
import { initState, reducer, selectedChord, selectedNote, type Action, type Brush } from "./state";
import { TopBar } from "./components/TopBar";
import { Timeline } from "./components/Timeline";
import { ChordPalette } from "./components/ChordPalette";
import { MelodyPanel } from "./components/MelodyPanel";
import { SoundPanel } from "./components/SoundPanel";
import { SongSheet } from "./components/SongSheet";
import { ToolDock, type Tool } from "./components/ToolDock";
import { Notice } from "./components/Notice";

const SILENT_HINT_KEY = "stepwise:silent-hint-dismissed";
const hintDismissed = () => {
  try {
    return localStorage.getItem(SILENT_HINT_KEY) === "1";
  } catch {
    return false;
  }
};

export default function App() {
  const [state, dispatch] = useReducer(reducer, undefined, () => initState(loadSaved() ?? exampleSong()));
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tool, setTool] = useState<Tool>("chords");
  const [songSheet, setSongSheet] = useState(false);
  const [theme, setTheme] = useState<ThemeChoice>(loadTheme);
  const themeRef = useRef(theme);
  const [silentHint, setSilentHint] = useState(false);
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

  // Theme: apply the choice and follow the device while it's "system".
  useEffect(() => {
    themeRef.current = theme;
    applyTheme(theme);
  }, [theme]);
  useEffect(() => watchSystemTheme(() => themeRef.current), []);

  // Audio: unlock it on the first tap, and wake it when the app comes back from the background.
  useEffect(() => {
    preferPlaybackAudio();
    const stop = unlockOnGesture(async () => {
      const ok = await engine.unlock();
      // iOS's silent switch mutes web audio on many versions; say so once, gently.
      if (ok && isIOS() && !hintDismissed()) setSilentHint(true);
      return ok;
    });
    const onVisible = () => document.visibilityState === "visible" && engine.resume();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

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

  const update = (patch: Partial<typeof song>, record?: boolean) => dispatch({ type: "updateSong", patch, record });

  // Keyboard shortcuts.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.matches("input, select, textarea") || target.closest("[role=dialog], [role=menu], [role=listbox]")) return;
      const run = (a: Action) => { e.preventDefault(); dispatch(a); };
      const mod = e.metaKey || e.ctrlKey;
      const k = e.key.toLowerCase();
      if (mod && k === "z") return run({ type: e.shiftKey ? "redo" : "undo" });
      if (mod && k === "y") return run({ type: "redo" });
      if (mod && k === "d") return run({ type: "duplicate" });
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
    <>
      {/* Phone-first shell: top bar, the loop in the middle, the tool dock at the bottom. */}
      <div className="mx-auto flex h-dvh max-w-screen-2xl flex-col pt-(--safe-top) pr-(--safe-right) pl-(--safe-left)">
        <TopBar
          song={song}
          playing={playing}
          theme={theme}
          onPlay={() => void togglePlay()}
          onUpdate={update}
          onSongSettings={() => setSongSheet(true)}
          onTheme={setTheme}
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

        <main className="flex min-h-0 flex-1 flex-col gap-2 p-2 sm:p-3">
          {error && <Notice tone="error" onClose={() => setError(null)}>{error}</Notice>}
          {silentHint && (
            <Notice onClose={() => {
              setSilentHint(false);
              try { localStorage.setItem(SILENT_HINT_KEY, "1"); } catch { /* storage blocked */ }
            }}>
              No sound? Check that the silent switch on the side of your phone is off, and turn the volume up.
            </Notice>
          )}
          <div className="min-h-0 flex-1">
            <Timeline
              song={song}
              sel={state.sel}
              cursor={state.cursor}
              playhead={state.playhead}
              playing={playing}
              onPlaceNote={(start, step) => {
                if (start >= totalBeats(song)) return;
                dispatch({ type: "placeNote", start, step });
                previewStep(step);
                setTool("melody");
              }}
              onSelect={(kind, id) => {
                dispatch({ type: "select", kind, id });
                if (kind === "chord") {
                  const c = song.chords.find((x) => x.id === id);
                  if (c) previewChord(c);
                  setTool("chords");
                } else {
                  const n = song.notes.find((x) => x.id === id);
                  if (n) previewStep(n.step, n.acc);
                  setTool("melody");
                }
              }}
              onDelete={() => dispatch({ type: "deleteSelected" })}
              onSetCursor={(beat) => { dispatch({ type: "setCursor", beat }); setTool("chords"); }}
              onSetPlayhead={(beat) => void setPlayhead(beat)}
              onPreviewStep={(s) => previewStep(s)}
              onEdit={(kind, id, start, dur, step) => dispatch({ type: "editItem", kind, id, start, dur, step })}
            />
          </div>
        </main>

        <ToolDock
          tool={tool}
          onTool={setTool}
          canUndo={state.past.length > 0}
          canRedo={state.future.length > 0}
          hasSelection={!!(chord || note)}
          onUndo={() => dispatch({ type: "undo" })}
          onRedo={() => dispatch({ type: "redo" })}
          onDelete={() => dispatch({ type: "deleteSelected" })}
        >
          {tool === "chords" && <ChordPalette song={song} brush={state.brush} cursor={state.cursor} onPlace={placeChord} onBrush={setBrush} />}
          {tool === "melody" && (
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
              onDuplicate={() => dispatch({ type: "duplicate" })}
            />
          )}
          {tool === "sound" && <SoundPanel song={song} onUpdate={update} />}
        </ToolDock>

        <SongSheet
          open={songSheet}
          onOpenChange={setSongSheet}
          song={song}
          onTitle={(title) => update({ title }, false)}
          onBars={(bars) => dispatch({ type: "setBars", bars })}
        />
      </div>
    </>
  );
}
