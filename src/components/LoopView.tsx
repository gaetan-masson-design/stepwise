import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type MouseEvent, type ReactNode } from "react";
import { AudioLines, AudioWaveform, Music2, ZoomIn, type LucideIcon } from "lucide-react";
import { totalBeats, type Song } from "../lib/song";
import { analyzeChord, mod } from "../lib/theory";
import { degreeColor } from "../lib/colors";
import { engine } from "../lib/audio";
import { fitBeatWidth, LAYER_LABEL, laneHits, nextZoom, pitchRange, pitchY, stepY, type Layer, type LaneHit } from "../lib/lanes";
import { useItemDrag } from "@/hooks/useItemDrag";
import { RomanNumeral } from "./RomanNumeral";
import { ChordTile } from "./ChordTile";
import { ChordsIcon } from "./ChordsIcon";
import type { Selection } from "../state";
import { cn } from "@/lib/utils";

/** Label column width: icons only on phones, icon and name from 640px of loop width. */
const labelWidth = (width: number) => (width >= 640 ? 96 : 52);

export const LAYER_ICON: Record<Layer, LucideIcon | typeof ChordsIcon> = {
  pads: ChordsIcon,
  arp: AudioLines,
  bass: AudioWaveform,
  melody: Music2,
};

/** Lane heights (Tailwind classes, so they stay on the spacing scale). Every lane is at least 44px. */
const LANE_H: Record<Layer, string> = {
  pads: "h-16",
  arp: "h-12",
  bass: "h-12",
  melody: "min-h-18 flex-1",
};

interface Props {
  song: Song;
  layer: Layer;
  sel: Selection;
  cursor: number;
  playhead: number;
  playing: boolean;
  onLayer: (layer: Layer) => void;
  onOpenMelody: (bar: number) => void;
  onSelectChord: (id: string) => void;
  onDelete: () => void;
  onSetCursor: (beat: number) => void;
  onSetPlayhead: (beat: number) => void;
  onEdit: (kind: "chord" | "note", id: string, start: number, dur: number) => void;
}

/**
 * The loop as four stacked lanes: Pads (the chords), Arp, Bass and Melody. At 1× the whole loop
 * fits the width; zoom stretches it and the lanes scroll sideways inside this view.
 */
export function LoopView(p: Props) {
  const { song } = p;
  const T = totalBeats(song);
  const scrollRef = useRef<HTMLDivElement>(null);
  const headRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [zoom, setZoom] = useState(1);
  const LW = labelWidth(width);
  // Floor to a hundredth of a pixel so rounding never makes the lanes a hair wider than the view.
  const BW = Math.floor(fitBeatWidth(width - LW, T, zoom) * 100) / 100;

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
  const hits = useMemo(() => laneHits(song), [song]);

  // Playhead: moved directly, not through React, on every frame.
  useEffect(() => {
    const head = headRef.current;
    if (!head) return;
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
      const el = scrollRef.current;
      if (el && zoom > 1) {
        const view = el.clientWidth - LW;
        if (x < el.scrollLeft + 20 || x > el.scrollLeft + view - 60) el.scrollLeft = Math.max(0, x - view * 0.3);
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [p.playing, p.playhead, BW, T, LW, zoom]);

  const { handlers, shown, draggingId } = useItemDrag({
    beatWidth: BW || 1,
    rowHeight: 1,
    total: T,
    chords: song.chords,
    notes: song.notes,
    onSelect: (_, id) => { p.onLayer("pads"); p.onSelectChord(id); },
    onPreviewStep: () => {},
    onEdit: (kind, id, start, dur) => p.onEdit(kind, id, start, dur),
  });

  const beatAt = (e: MouseEvent) => (e.clientX - e.currentTarget.getBoundingClientRect().left) / BW;
  const vars = { "--bw": `${BW}px`, "--bar": `${BW * song.beatsPerBar}px` } as CSSProperties;
  const tiny = BW * 4 < 44; // a one-bar chord narrower than a fingertip: show the numeral only

  const lane = (layer: Layer, content: ReactNode, onClick: (e: MouseEvent<HTMLDivElement>) => void, label: string) => (
    <div
      key={layer}
      role="button"
      tabIndex={-1}
      aria-label={label}
      className={cn("relative cursor-pointer border-t grid-beats", LANE_H[layer], p.layer === layer && "bg-accent/60")}
      onClick={onClick}
    >
      {content}
    </div>
  );

  const hitBars = (list: LaneHit[], barH: string) => {
    const range = pitchRange(list);
    return list.map((h, i) => (
      <div
        key={i}
        className={cn("pointer-events-none absolute rounded-full", barH)}
        style={{ left: h.start * BW, width: Math.max(2, h.dur * BW - 1), top: `calc(${pitchY(h.notes[0], range)} * (100% - var(--spacing) * 4) + var(--spacing))`, background: degreeColor(h.degree) }}
      />
    ));
  };

  return (
    <div ref={scrollRef} className="relative h-full overflow-auto overscroll-contain rounded-lg border bg-surface">
      <div className="flex min-h-full w-max min-w-full" style={vars}>
        {/* Lane labels: tap to pick a layer. They stay put when a zoomed loop scrolls. */}
        <div className="sticky left-0 z-20 flex shrink-0 flex-col border-r bg-surface-2" style={{ width: LW }}>
          <button
            type="button"
            className="flex h-touch items-center justify-center gap-1 text-xs font-semibold text-muted-foreground hover:bg-accent"
            aria-label={`Zoom: ${zoom}×. Tap to change.`}
            onClick={() => setZoom(nextZoom(zoom))}
          >
            <ZoomIn className="size-4" /> {zoom}×
          </button>
          {(["pads", "arp", "bass", "melody"] as Layer[]).map((l) => {
            const Icon = LAYER_ICON[l];
            return (
              <button
                key={l}
                type="button"
                aria-pressed={p.layer === l}
                onClick={() => p.onLayer(l)}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 border-t text-2xs font-semibold text-muted-foreground hover:bg-accent sm:flex-row sm:justify-start sm:gap-2 sm:px-3 sm:text-sm",
                  LANE_H[l],
                  p.layer === l && "bg-selected text-selected-foreground hover:bg-selected",
                )}
              >
                <Icon className="size-4 shrink-0" />
                {LAYER_LABEL[l]}
              </button>
            );
          })}
        </div>

        <div className="relative flex shrink-0 flex-col overflow-x-clip" style={{ width: T * BW }}>
          {/* Ruler: tap to set where playback starts */}
          <div
            className="relative h-touch shrink-0 cursor-pointer ruler-ticks"
            aria-label="Set where playback starts"
            onClick={(e) => p.onSetPlayhead(Math.max(0, Math.min(T - 0.5, Math.floor(beatAt(e) * 2) / 2)))}
          >
            {Array.from({ length: song.bars }, (_, i) => (
              <div key={i} className="absolute inset-y-0 border-l border-muted-foreground pt-1 pl-1 font-mono text-xs text-muted-foreground" style={{ left: i * song.beatsPerBar * BW }}>{i + 1}</div>
            ))}
          </div>

          {lane("pads", (
            <>
              {shown(song.chords, "chord").map((c) => {
                const a = analyses.get(c.id)!;
                const selected = p.sel?.id === c.id;
                return (
                  <ChordTile
                    key={c.id}
                    color={degreeColor(c.degree)}
                    borrowed={c.borrowed}
                    applied={!!c.applied}
                    className={cn(
                      "group absolute inset-y-1.5 touch-none flex-col justify-between overflow-hidden rounded-md px-1 py-1 sm:px-1.5",
                      selected && "z-3 outline-2 outline-offset-1 outline-foreground",
                      draggingId === c.id && "z-4 cursor-grabbing opacity-85",
                    )}
                    style={{ left: c.start * BW + 1, width: Math.max(4, c.dur * BW - 2) }}
                    title={a.name}
                    data-selected={selected || undefined}
                    {...handlers("chord", c)}
                    onClick={(e) => e.stopPropagation()}
                    onDoubleClick={p.onDelete}
                  >
                    <RomanNumeral a={a} className={tiny ? "text-sm" : "text-lg"} />
                    {!tiny && <span className="truncate font-mono text-xs font-semibold opacity-85">{a.name}</span>}
                    <span data-grip aria-hidden className="absolute inset-y-0 right-0 w-2 cursor-ew-resize pointer-coarse:w-3" />
                  </ChordTile>
                );
              })}
              <div className="pointer-events-none absolute inset-y-0.5 -ml-px w-0.75 animate-blink rounded-full bg-cursor motion-reduce:animate-none" style={{ left: p.cursor * BW }} />
            </>
          ), (e) => { p.onLayer("pads"); p.onSetCursor(Math.round(beatAt(e))); }, "Pads: tap to place the next chord here")}

          {lane("arp", hitBars(hits.arp, "h-1"), () => p.onLayer("arp"), "Arp")}
          {lane("bass", hitBars(hits.bass, "h-1.5"), () => p.onLayer("bass"), "Bass")}

          {lane("melody", (
            <>
              {song.notes.map((n) => (
                <div
                  key={n.id}
                  className={cn("pointer-events-none absolute h-1.5 rounded-full", p.sel?.id === n.id && "outline-2 outline-foreground")}
                  style={{ left: n.start * BW, width: Math.max(2, n.dur * BW - 1), top: `calc(${stepY(n.step)} * (100% - var(--spacing) * 5.5) + var(--spacing))`, background: degreeColor(mod(n.step, 7) + 1) }}
                />
              ))}
              {!song.notes.length && <span className="pointer-events-none absolute inset-0 grid place-items-center text-sm text-muted-foreground">Tap to write a melody</span>}
            </>
          ), (e) => { p.onLayer("melody"); p.onOpenMelody(Math.floor(beatAt(e) / song.beatsPerBar)); }, "Melody: tap to open the melody editor here")}

          <div ref={headRef} className="playhead playhead-cap" />
        </div>
      </div>
    </div>
  );
}
