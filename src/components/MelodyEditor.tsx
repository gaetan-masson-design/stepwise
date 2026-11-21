import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { BOTTOM_STEP, TOP_STEP, totalBeats, type Song } from "../lib/song";
import { analyzeChord, mod, MODES, stepPitchName, stepToSemitone } from "../lib/theory";
import { degreeColor } from "../lib/colors";
import { engine } from "../lib/audio";
import { useItemDrag } from "@/hooks/useItemDrag";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { Button } from "@/components/ui/button";
import type { Selection } from "../state";
import { cn } from "@/lib/utils";

const ROWS = TOP_STEP - BOTTOM_STEP + 1;
const STEPS = Array.from({ length: ROWS }, (_, i) => TOP_STEP - i);
/** Row label column, px. */
const LABEL_W = 60;

interface Props {
  song: Song;
  sel: Selection;
  playhead: number;
  playing: boolean;
  /** First bar shown (0-based). */
  startBar: number;
  /** How many bars fit: 1 on phones, 2 with more room. */
  windowBars: number;
  onStartBar: (bar: number) => void;
  onClose: () => void;
  onPlaceNote: (start: number, step: number) => void;
  onSelectNote: (id: string) => void;
  onDelete: () => void;
  onPreviewStep: (step: number) => void;
  onEdit: (id: string, start: number, dur: number, step?: number) => void;
}

/**
 * The Melody lane, zoomed in to one or two bars with rows big enough to tap: rows are scale
 * degrees, tinted where they belong to the chord underneath.
 */
export function MelodyEditor(p: Props) {
  const { song, startBar, windowBars } = p;
  const T = totalBeats(song);
  const scale = MODES[song.mode];
  const fine = useMediaQuery("(pointer: fine)");
  const RH = fine ? 28 : 44; // 44px rows on touch screens
  const gridRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const headRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const winStart = startBar * song.beatsPerBar;
  const winBeats = Math.min(windowBars, song.bars - startBar) * song.beatsPerBar;
  const winEnd = winStart + winBeats;
  const BW = width / (windowBars * song.beatsPerBar);
  const inWindow = (x: { start: number; dur: number }) => x.start < winEnd && x.start + x.dur > winStart;

  useLayoutEffect(() => {
    const el = gridRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    setWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  // Open scrolled to where the notes are (or around the tonic).
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const steps = song.notes.filter(inWindow).map((n) => n.step).sort((a, b) => a - b);
    const mid = steps.length ? steps[Math.floor(steps.length / 2)] : 4;
    el.scrollTop = (TOP_STEP - mid) * RH - el.clientHeight / 2;
    // Only when the window or row size changes, not on every edit.
  }, [startBar, RH]);

  const analyses = useMemo(
    () => new Map(song.chords.map((c) => [c.id, analyzeChord(c, song.key, song.mode)])),
    [song.chords, song.key, song.mode],
  );

  useEffect(() => {
    const head = headRef.current;
    if (!head) return;
    const place = (beat: number) => {
      head.hidden = beat < winStart || beat >= winEnd || (!p.playing && beat === 0);
      head.style.left = `${(beat - winStart) * BW}px`;
    };
    if (!p.playing) return place(p.playhead);
    let raf = 0;
    const frame = () => {
      place(engine.position % T);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [p.playing, p.playhead, BW, T, winStart, winEnd]);

  const { handlers, shown, draggingId } = useItemDrag({
    beatWidth: BW || 1,
    rowHeight: RH,
    total: T,
    chords: song.chords,
    notes: song.notes,
    onSelect: (_, id) => p.onSelectNote(id),
    onPreviewStep: p.onPreviewStep,
    onEdit: (_, id, start, dur, step) => p.onEdit(id, start, dur, step),
  });

  const vars = { "--bw": `${BW}px`, "--bar": `${BW * song.beatsPerBar}px`, "--rh": `${RH}px` } as CSSProperties;
  const last = Math.max(0, song.bars - windowBars);
  const shownBars = winBeats / song.beatsPerBar;

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-lg border bg-surface">
      <div className="flex items-center gap-1 border-b bg-surface-2 px-1">
        <Button variant="ghost" size="icon" aria-label="Earlier bars" disabled={startBar <= 0} onClick={() => p.onStartBar(Math.max(0, startBar - windowBars))}><ChevronLeft /></Button>
        <span className="min-w-0 flex-1 truncate text-center text-sm font-semibold">
          Melody · {shownBars === 1 ? `bar ${startBar + 1}` : `bars ${startBar + 1}–${startBar + shownBars}`} <span className="font-normal text-muted-foreground">of {song.bars}</span>
        </span>
        <Button variant="ghost" size="icon" aria-label="Later bars" disabled={startBar >= last} onClick={() => p.onStartBar(Math.min(last, startBar + windowBars))}><ChevronRight /></Button>
        <Button variant="outline" size="sm" onClick={p.onClose}><X /> Done</Button>
      </div>

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div className="flex" style={vars}>
          {/* Row labels: tap to hear the note */}
          <div className="sticky left-0 z-10 shrink-0 border-r bg-surface-2" style={{ width: LABEL_W }}>
            {STEPS.map((s) => {
              const d = mod(s, 7) + 1;
              return (
                <button
                  key={s} type="button"
                  className={cn("flex w-full items-center gap-1.5 border-b border-border-subtle px-1.5 font-mono text-xs select-none hover:bg-accent", d === 1 ? "font-semibold text-foreground" : "text-muted-foreground")}
                  style={{ height: RH }}
                  aria-label={`Hear ${stepPitchName(s, 0, song.key, song.mode)}`}
                  onPointerDown={() => p.onPreviewStep(s)}
                >
                  <span className="grid size-5 shrink-0 place-items-center rounded-xs text-2xs font-semibold text-deg-ink" style={{ background: degreeColor(d) }}>{d}</span>
                  <span className="truncate">{stepPitchName(s, 0, song.key, song.mode)}</span>
                </button>
              );
            })}
          </div>

          {/* Grid: tap an empty spot to add a note */}
          <div
            ref={gridRef}
            className="relative min-w-0 flex-1 cursor-crosshair overflow-hidden grid-melody"
            style={{ height: ROWS * RH }}
            onClick={(e) => {
              if ((e.target as HTMLElement).closest("[data-item]")) return;
              const r = e.currentTarget.getBoundingClientRect();
              const start = winStart + Math.floor((e.clientX - r.left) / (BW / 2)) / 2;
              if (start >= winEnd) return;
              p.onPlaceNote(start, TOP_STEP - Math.floor((e.clientY - r.top) / RH));
            }}
          >
            {STEPS.filter((s) => mod(s, 7) === 0).map((s) => (
              <div key={s} className="pointer-events-none absolute inset-x-0 bg-border-subtle opacity-70" style={{ top: (TOP_STEP - s) * RH, height: RH }} />
            ))}
            {winBeats < windowBars * song.beatsPerBar && (
              <div className="pointer-events-none absolute inset-y-0 right-0 bg-muted" style={{ left: winBeats * BW }} aria-hidden />
            )}
            {song.chords.filter(inWindow).flatMap((c) => {
              const a = analyses.get(c.id)!;
              return STEPS.filter((s) => a.pitchClasses.has(mod(stepToSemitone(scale, s), 12))).map((s) => (
                <div key={`${c.id}:${s}`} className="pointer-events-none absolute rounded-xs opacity-22" style={{ left: (c.start - winStart) * BW + 1, width: c.dur * BW - 2, top: (TOP_STEP - s) * RH + 1, height: RH - 2, background: degreeColor(c.degree) }} />
              ));
            })}
            {shown(song.notes, "note").filter(inWindow).map((n) => {
              const d = mod(n.step, 7) + 1;
              const selected = p.sel?.id === n.id;
              return (
                <div
                  key={n.id}
                  className={cn(
                    "group absolute flex touch-none items-center overflow-hidden rounded-sm px-1.5 font-mono text-xs font-semibold whitespace-nowrap text-deg-ink shadow-tile select-none",
                    selected && "z-3 outline-2 outline-offset-1 outline-foreground",
                    draggingId === n.id && "z-4 cursor-grabbing opacity-85",
                  )}
                  style={{ left: (n.start - winStart) * BW + 1, width: n.dur * BW - 2, top: (TOP_STEP - n.step) * RH + 2, height: RH - 4, background: degreeColor(d) }}
                  data-selected={selected || undefined}
                  {...handlers("note", n)}
                  onDoubleClick={p.onDelete}
                >
                  {n.acc < 0 ? "♭" : n.acc > 0 ? "♯" : ""}{d}
                  <span data-grip aria-hidden className="absolute inset-y-0 right-0 w-2.5 cursor-ew-resize pointer-coarse:w-4" />
                </div>
              );
            })}
            <div ref={headRef} className="playhead" />
          </div>
        </div>
      </div>
    </div>
  );
}
