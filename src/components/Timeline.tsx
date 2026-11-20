import { useEffect, useMemo, useRef, type PointerEvent } from "react";
import { BOTTOM_STEP, TOP_STEP, totalBeats, type Song } from "../lib/song";
import { analyzeChord, keyOffset, mod, MODES, NOTE_NAMES, stepToSemitone } from "../lib/theory";
import { degreeColor } from "../lib/colors";
import { engine } from "../lib/audio";
import { RomanNumeral } from "./RomanNumeral";
import type { Selection } from "../state";

const ROW_H = 20;
const ROWS = TOP_STEP - BOTTOM_STEP + 1;
const STEPS = Array.from({ length: ROWS }, (_, i) => TOP_STEP - i);

interface Props {
  song: Song;
  sel: Selection;
  cursor: number;
  playhead: number;
  playing: boolean;
  beatWidth: number;
  onPlaceNote: (start: number, step: number) => void;
  onSelect: (kind: "chord" | "note", id: string) => void;
  onDelete: () => void;
  onSetCursor: (beat: number) => void;
  onSetPlayhead: (beat: number) => void;
  onPreviewStep: (step: number) => void;
}

export function Timeline(p: Props) {
  const { song, beatWidth: BW } = p;
  const T = totalBeats(song);
  const scale = MODES[song.mode];
  const scrollRef = useRef<HTMLDivElement>(null);
  const headRef = useRef<HTMLDivElement>(null);
  const analyses = useMemo(
    () => new Map(song.chords.map((c) => [c.id, analyzeChord(c, song.key, song.mode)])),
    [song.chords, song.key, song.mode],
  );

  // Move the playhead without re-rendering React on every frame.
  useEffect(() => {
    const head = headRef.current;
    if (!head) return;
    const follow = (x: number) => {
      const el = scrollRef.current;
      if (!el) return;
      if (x < el.scrollLeft + 20 || x > el.scrollLeft + el.clientWidth - 60) el.scrollLeft = Math.max(0, x - el.clientWidth * 0.3);
    };
    if (!p.playing) {
      head.style.left = `${p.playhead * BW}px`;
      head.hidden = p.playhead === 0;
      return;
    }
    head.hidden = false;
    let raf = 0;
    const frame = () => {
      const x = (engine.position % T) * BW;
      head.style.left = `${x}px`;
      follow(x);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [p.playing, p.playhead, BW, T]);

  const localX = (e: PointerEvent) => e.clientX - e.currentTarget.getBoundingClientRect().left;

  return (
    <div className="stage">
      <div className="labels">
        <div className="ruler-sp" />
        {STEPS.map((s) => {
          const d = mod(s, 7) + 1;
          const midi = 60 + keyOffset(song.key) + stepToSemitone(scale, s);
          return (
            <button key={s} className={`rl${d === 1 ? " tonic" : ""}`} style={{ height: ROW_H }} onPointerDown={() => p.onPreviewStep(s)}>
              <span className="chip" style={{ background: degreeColor(d) }}>{d}</span>
              <span className="nn">{NOTE_NAMES[mod(midi, 12)]}{Math.floor(midi / 12) - 1}</span>
            </button>
          );
        })}
        <div className="lane-lbl">Chords</div>
      </div>

      <div className="scroll" ref={scrollRef}>
        <div className="tl" style={{ width: T * BW, ["--bw" as string]: `${BW}px`, ["--bar" as string]: `${BW * song.beatsPerBar}px`, ["--rh" as string]: `${ROW_H}px` }}>
          <div className="ruler" onPointerDown={(e) => p.onSetPlayhead(Math.max(0, Math.min(T - 0.5, Math.floor((localX(e) / BW) * 2) / 2)))}>
            {Array.from({ length: song.bars }, (_, i) => (
              <div key={i} className="barnum" style={{ left: i * song.beatsPerBar * BW }}>{i + 1}</div>
            ))}
          </div>

          <div
            className="mel"
            style={{ height: ROWS * ROW_H }}
            onPointerDown={(e) => {
              if ((e.target as HTMLElement).closest(".note")) return;
              const r = e.currentTarget.getBoundingClientRect();
              const step = TOP_STEP - Math.floor((e.clientY - r.top) / ROW_H);
              p.onPlaceNote(Math.floor((e.clientX - r.left) / (BW / 2)) / 2, step);
            }}
          >
            {STEPS.filter((s) => mod(s, 7) === 0).map((s) => (
              <div key={s} className="tonicrow" style={{ top: (TOP_STEP - s) * ROW_H, height: ROW_H }} />
            ))}
            {song.chords.flatMap((c) => {
              const a = analyses.get(c.id)!;
              return STEPS.filter((s) => a.pitchClasses.has(mod(stepToSemitone(scale, s), 12))).map((s) => (
                <div key={`${c.id}:${s}`} className="band" style={{ left: c.start * BW + 1, width: c.dur * BW - 2, top: (TOP_STEP - s) * ROW_H + 1, height: ROW_H - 2, background: degreeColor(c.degree) }} />
              ));
            })}
            {song.notes.map((n) => {
              const d = mod(n.step, 7) + 1;
              return (
                <div
                  key={n.id}
                  className={`note${p.sel?.id === n.id ? " sel" : ""}`}
                  style={{ left: n.start * BW + 1, width: n.dur * BW - 2, top: (TOP_STEP - n.step) * ROW_H + 1, height: ROW_H - 2, background: degreeColor(d) }}
                  onPointerDown={() => p.onSelect("note", n.id)}
                  onDoubleClick={p.onDelete}
                >
                  {n.acc < 0 ? "♭" : n.acc > 0 ? "♯" : ""}{d}
                </div>
              );
            })}
          </div>

          <div className="lane" onPointerDown={(e) => { if (!(e.target as HTMLElement).closest(".chord")) p.onSetCursor(Math.floor(localX(e) / BW + 0.5)); }}>
            {song.chords.map((c) => {
              const a = analyses.get(c.id)!;
              return (
                <div
                  key={c.id}
                  className={`chord${c.borrowed ? " borrowed" : ""}${p.sel?.id === c.id ? " sel" : ""}`}
                  style={{ left: c.start * BW + 2, width: c.dur * BW - 4, backgroundColor: degreeColor(c.degree) }}
                  title={a.name}
                  onPointerDown={() => p.onSelect("chord", c.id)}
                  onDoubleClick={p.onDelete}
                >
                  <RomanNumeral a={a} />
                  <span className="cn">{a.name}</span>
                </div>
              );
            })}
            <div className="cursor" style={{ left: p.cursor * BW }} />
          </div>

          <div className="playhead" ref={headRef} />
        </div>
      </div>
    </div>
  );
}
