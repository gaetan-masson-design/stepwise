import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type MouseEvent, type PointerEvent } from "react";
import { BOTTOM_STEP, clearRange, TOP_STEP, totalBeats, type Song } from "../lib/song";
import { analyzeChord, mod, MODES, stepPitchName, stepToSemitone } from "../lib/theory";
import { degreeColor } from "../lib/colors";
import { engine } from "../lib/audio";
import { RomanNumeral } from "./RomanNumeral";
import { ChordTile } from "./ChordTile";
import { MIN_DUR, type Selection } from "../state";
import { cn } from "@/lib/utils";

/**
 * Timeline geometry in px. The grid maths needs these in JS, so they live here and reach CSS as
 * variables; everything else (colour, type, radius) comes from the design tokens.
 */
export const TIMELINE = {
  rowH: 22,
  laneH: 64,
  rulerH: 28,
  /** Label column: narrow on phones, roomier from 640px of timeline width. */
  labelW: (width: number) => (width >= 640 ? 72 : 56),
  /** Beats squeeze to fit the loop on screen, within these bounds; past the minimum it scrolls. */
  minBeat: 24,
  maxBeat: 72,
};

const ROWS = TOP_STEP - BOTTOM_STEP + 1;
const STEPS = Array.from({ length: ROWS }, (_, i) => TOP_STEP - i);

interface Props {
  song: Song;
  sel: Selection;
  cursor: number;
  playhead: number;
  playing: boolean;
  onPlaceNote: (start: number, step: number) => void;
  onSelect: (kind: "chord" | "note", id: string) => void;
  onDelete: () => void;
  onSetCursor: (beat: number) => void;
  onSetPlayhead: (beat: number) => void;
  onPreviewStep: (step: number) => void;
  onEdit: (kind: "chord" | "note", id: string, start: number, dur: number, step?: number) => void;
}

interface Drag {
  kind: "chord" | "note";
  id: string;
  resize: boolean;
  pointer: number;
  x0: number;
  y0: number;
  orig: { start: number; dur: number; step: number };
  start: number;
  dur: number;
  step: number;
}

const ITEM = "[data-item]";

export function Timeline(p: Props) {
  const { song } = p;
  const T = totalBeats(song);
  const scale = MODES[song.mode];
  const scrollRef = useRef<HTMLDivElement>(null);
  const headRefs = [useRef<HTMLDivElement>(null), useRef<HTMLDivElement>(null)];
  const [width, setWidth] = useState(0);
  const LW = TIMELINE.labelW(width);
  const BW = width ? Math.max(TIMELINE.minBeat, Math.min(TIMELINE.maxBeat, Math.floor((width - LW) / T))) : TIMELINE.minBeat;
  const { rowH: RH } = TIMELINE;

  // Fit the loop to the available width.
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    setWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  const analyses = useMemo(
    () => new Map(song.chords.map((c) => [c.id, analyzeChord(c, song.key, song.mode)])),
    [song.chords, song.key, song.mode],
  );

  // Move the playhead without re-rendering React on every frame.
  useEffect(() => {
    const heads = headRefs.map((r) => r.current).filter((h): h is HTMLDivElement => !!h);
    const place = (x: number, hidden: boolean) => heads.forEach((h) => { h.style.left = `${x}px`; h.hidden = hidden; });
    const follow = (x: number) => {
      const el = scrollRef.current;
      if (!el) return;
      const view = el.clientWidth - LW;
      if (x < el.scrollLeft + 20 || x > el.scrollLeft + view - 60) el.scrollLeft = Math.max(0, x - view * 0.3);
    };
    if (!p.playing) {
      place(p.playhead * BW, p.playhead === 0);
      return;
    }
    let raf = 0;
    const frame = () => {
      const x = (engine.position % T) * BW;
      place(x, false);
      follow(x);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [p.playing, p.playhead, BW, T, LW]);

  const localX = (e: MouseEvent) => e.clientX - e.currentTarget.getBoundingClientRect().left;

  // Dragging an item moves it; dragging its right-edge grip resizes it. Snaps to half beats.
  const [drag, setDrag] = useState<Drag | null>(null);
  const dragHandlers = (kind: "chord" | "note", item: { id: string; start: number; dur: number; step?: number }) => ({
    "data-item": kind,
    onPointerDown: (e: PointerEvent<HTMLDivElement>) => {
      if (e.button !== 0 || drag) return; // one drag at a time (ignore a second finger)
      p.onSelect(kind, item.id);
      e.currentTarget.setPointerCapture(e.pointerId);
      const orig = { start: item.start, dur: item.dur, step: item.step ?? 0 };
      setDrag({ kind, id: item.id, resize: !!(e.target as HTMLElement).closest("[data-grip]"), pointer: e.pointerId, x0: e.clientX, y0: e.clientY, orig, ...orig });
    },
    onPointerMove: (e: PointerEvent<HTMLDivElement>) => {
      if (!drag || drag.pointer !== e.pointerId) return;
      const dBeat = Math.round(((e.clientX - drag.x0) / BW) * 2) / 2;
      const { orig } = drag;
      if (drag.resize) {
        const dur = Math.max(MIN_DUR, Math.min(T - orig.start, orig.dur + dBeat));
        if (dur !== drag.dur) setDrag({ ...drag, dur });
        return;
      }
      const start = Math.max(0, Math.min(T - orig.dur, orig.start + dBeat));
      const step = kind === "note"
        ? Math.max(BOTTOM_STEP, Math.min(TOP_STEP, orig.step - Math.round((e.clientY - drag.y0) / RH)))
        : 0;
      if (start === drag.start && step === drag.step) return;
      if (step !== drag.step) p.onPreviewStep(step);
      setDrag({ ...drag, start, step });
    },
    onPointerUp: (e: PointerEvent<HTMLDivElement>) => {
      if (!drag || drag.pointer !== e.pointerId) return;
      const { orig, start, dur, step } = drag;
      setDrag(null);
      if (start !== orig.start || dur !== orig.dur || step !== orig.step)
        p.onEdit(drag.kind, drag.id, start, dur, drag.kind === "note" ? step : undefined);
    },
    onPointerCancel: () => setDrag(null),
    onLostPointerCapture: () => setDrag(null),
  });
  // The dragged item can vanish mid-drag (Delete, undo); its pointerup never arrives then.
  useEffect(() => {
    if (drag && !(drag.kind === "note" ? song.notes : song.chords).some((x) => x.id === drag.id)) setDrag(null);
  }, [drag, song.notes, song.chords]);
  // While dragging, show the result the drop will have, including trimmed neighbours.
  const shown = <X extends { id: string; start: number; dur: number }>(items: X[], kind: "chord" | "note"): X[] => {
    if (!drag || drag.kind !== kind) return items;
    const { start, dur } = drag;
    return clearRange(items, start, start + dur, drag.id)
      .map((x) => (x.id === drag.id ? { ...x, start, dur, ...(kind === "note" ? { step: drag.step } : {}) } : x));
  };

  const vars = {
    "--bw": `${BW}px`,
    "--bar": `${BW * song.beatsPerBar}px`,
    "--rh": `${RH}px`,
    gridTemplateColumns: `${LW}px ${T * BW}px`,
  } as CSSProperties;
  const itemState = (id: string) => cn(p.sel?.id === id && "z-3 outline-2 outline-offset-1 outline-foreground", drag?.id === id && "z-4 cursor-grabbing opacity-85");
  const grip = <span data-grip aria-hidden className="absolute inset-y-0 right-0 w-2 cursor-ew-resize pointer-coarse:w-3 after:absolute after:inset-y-1/4 after:right-0.5 after:w-0.5 after:rounded-full after:bg-current after:opacity-0 after:transition-opacity group-hover:after:opacity-45 group-data-[selected]:after:opacity-45" />;

  return (
    <div ref={scrollRef} className="relative h-full overflow-auto overscroll-contain rounded-lg border bg-surface">
      <div className="grid w-max min-w-full" style={vars}>
        {/* Top-left corner: stays put both ways */}
        <div className="sticky top-0 left-0 z-30 flex flex-col border-r border-b bg-surface-2">
          <div style={{ height: TIMELINE.rulerH }} className="border-b" />
          <div style={{ height: TIMELINE.laneH }} className="grid place-items-center label-caps">Chords</div>
        </div>

        {/* Ruler and chord lane: stay at the top while the melody scrolls */}
        <div className="sticky top-0 z-20 border-b bg-surface">
          <div
            className="relative cursor-pointer border-b ruler-ticks" style={{ height: TIMELINE.rulerH }}
            aria-label="Set where playback starts"
            onClick={(e) => p.onSetPlayhead(Math.max(0, Math.min(T - 0.5, Math.floor((localX(e) / BW) * 2) / 2)))}
          >
            {Array.from({ length: song.bars }, (_, i) => (
              <div key={i} className="absolute top-0 h-full border-l border-muted-foreground px-1.5 py-1 font-mono text-xs text-muted-foreground" style={{ left: i * song.beatsPerBar * BW }}>{i + 1}</div>
            ))}
          </div>
          <div
            className="relative cursor-pointer grid-beats" style={{ height: TIMELINE.laneH }}
            onClick={(e) => { if (!(e.target as HTMLElement).closest(ITEM)) p.onSetCursor(Math.floor(localX(e) / BW + 0.5)); }}
          >
            {shown(song.chords, "chord").map((c) => {
              const a = analyses.get(c.id)!;
              return (
                <ChordTile
                  key={c.id}
                  color={degreeColor(c.degree)}
                  borrowed={c.borrowed}
                  applied={!!c.applied}
                  className={cn("group absolute inset-y-1.5 touch-none flex-col justify-between rounded-md px-1.5 py-1.5", itemState(c.id))}
                  style={{ left: c.start * BW + 2, width: c.dur * BW - 4 }}
                  title={a.name}
                  data-selected={p.sel?.id === c.id || undefined}
                  {...dragHandlers("chord", c)}
                  onDoubleClick={p.onDelete}
                >
                  <RomanNumeral a={a} className="text-lg" />
                  <span className="truncate font-mono text-xs font-semibold opacity-85">{a.name}</span>
                  {grip}
                </ChordTile>
              );
            })}
            <div className="pointer-events-none absolute inset-y-0.5 -ml-px w-0.75 animate-blink rounded-full bg-cursor motion-reduce:animate-none" style={{ left: p.cursor * BW }} />
          </div>
          <div ref={headRefs[0]} className="playhead playhead-cap" />
        </div>

        {/* Row labels: tap to hear the note */}
        <div className="sticky left-0 z-10 border-r bg-surface-2">
          {STEPS.map((s) => {
            const d = mod(s, 7) + 1;
            return (
              <button
                key={s} type="button"
                className={cn("flex w-full items-center gap-1 px-1 font-mono text-xs select-none hover:bg-border-subtle sm:gap-1.5 sm:px-2", d === 1 ? "font-semibold text-foreground" : "text-muted-foreground")}
                style={{ height: RH }}
                aria-label={`Hear degree ${d}`}
                onPointerDown={() => p.onPreviewStep(s)}
              >
                <span className="grid h-3.5 w-4 shrink-0 place-items-center rounded-xs text-2xs font-semibold text-deg-ink" style={{ background: degreeColor(d) }}>{d}</span>
                <span className="truncate">{stepPitchName(s, 0, song.key, song.mode)}</span>
              </button>
            );
          })}
        </div>

        {/* Melody grid */}
        <div
          className="relative cursor-crosshair grid-melody"
          style={{ height: ROWS * RH }}
          onClick={(e) => {
            if ((e.target as HTMLElement).closest(ITEM)) return;
            const r = e.currentTarget.getBoundingClientRect();
            const step = TOP_STEP - Math.floor((e.clientY - r.top) / RH);
            p.onPlaceNote(Math.floor((e.clientX - r.left) / (BW / 2)) / 2, step);
          }}
        >
          {STEPS.filter((s) => mod(s, 7) === 0).map((s) => (
            <div key={s} className="pointer-events-none absolute inset-x-0 bg-border-subtle opacity-70" style={{ top: (TOP_STEP - s) * RH, height: RH }} />
          ))}
          {shown(song.chords, "chord").flatMap((c) => {
            const a = analyses.get(c.id)!;
            return STEPS.filter((s) => a.pitchClasses.has(mod(stepToSemitone(scale, s), 12))).map((s) => (
              <div key={`${c.id}:${s}`} className="pointer-events-none absolute rounded-xs opacity-22" style={{ left: c.start * BW + 1, width: c.dur * BW - 2, top: (TOP_STEP - s) * RH + 1, height: RH - 2, background: degreeColor(c.degree) }} />
            ));
          })}
          {shown(song.notes, "note").map((n) => {
            const d = mod(n.step, 7) + 1;
            return (
              <div
                key={n.id}
                className={cn("group absolute flex touch-none items-center overflow-hidden rounded-sm px-1 font-mono text-2xs font-semibold whitespace-nowrap text-deg-ink shadow-tile select-none", itemState(n.id))}
                style={{ left: n.start * BW + 1, width: n.dur * BW - 2, top: (TOP_STEP - n.step) * RH + 1, height: RH - 2, background: degreeColor(d) }}
                data-selected={p.sel?.id === n.id || undefined}
                {...dragHandlers("note", n)}
                onDoubleClick={p.onDelete}
              >
                {n.acc < 0 ? "♭" : n.acc > 0 ? "♯" : ""}{d}
                {grip}
              </div>
            );
          })}
          <div ref={headRefs[1]} className="playhead" />
        </div>
      </div>
    </div>
  );
}
