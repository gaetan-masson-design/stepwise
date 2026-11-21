import { analyzeChord, canTonicize, CHORD_TYPE_LABEL, CHORD_TYPES, keyName, LIKELY_NEXT, maxInversion, MODE_LABEL, PARALLEL, type ChordType } from "../lib/theory";
import { degreeColor } from "../lib/colors";
import type { Song } from "../lib/song";
import type { Brush } from "../state";
import { RomanNumeral } from "./RomanNumeral";
import { OptionGroup } from "./OptionGroup";
import { Panel } from "./Panel";
import { ChordTile } from "./ChordTile";
import { Toggle } from "@/components/ui/toggle";
import { cn } from "@/lib/utils";

interface Props {
  song: Song;
  brush: Brush;
  cursor: number;
  onPlace: (degree: number) => void;
  onBrush: (patch: Partial<Brush>) => void;
}

const TYPE_OPTS = (Object.keys(CHORD_TYPES) as ChordType[]).map((t) => [t, CHORD_TYPE_LABEL[t]] as const);
const INV_OPTS = [[0, "Root"], [1, "1st"], [2, "2nd"], [3, "3rd"]] as const;
const DUR_OPTS = [[1, "1 beat"], [2, "2 beats"], [4, "4 beats"], [8, "2 bars"]] as const;

export function ChordPalette({ song, brush, cursor, onPlace, onBrush }: Props) {
  const prev = song.chords.filter((c) => c.start < cursor).at(-1);
  // An applied chord wants to resolve to its target.
  const likely = !prev || brush.applied ? [] : prev.applied ? [prev.applied] : prev.borrowed ? [] : LIKELY_NEXT[prev.degree];
  // A chord resized by dragging can have a length the presets don't offer; show it.
  const durOpts = DUR_OPTS.some(([d]) => d === brush.dur)
    ? DUR_OPTS
    : [...DUR_OPTS, [brush.dur, `${brush.dur} beats`] as const].sort((x, y) => x[0] - y[0]);
  const appliedOpts = [[0, "Off"] as const, ...[2, 3, 4, 5, 6, 7].map((t) =>
    [t, "/" + analyzeChord({ degree: t, type: "triad", inv: 0, borrowed: brush.borrowed }, song.key, song.mode).numeral] as const)];

  return (
    <Panel
      title="Chords"
      aside={<>{keyName(song.key, song.mode)} {MODE_LABEL[song.mode].toLowerCase()} · borrowed from {MODE_LABEL[PARALLEL[song.mode]].toLowerCase()}</>}
    >
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
        {[1, 2, 3, 4, 5, 6, 7].map((d) => {
          const a = analyzeChord({ degree: d, ...brush }, song.key, song.mode);
          const next = likely.includes(d);
          return (
            <ChordTile
              key={d}
              as="button"
              color={degreeColor(d)}
              borrowed={brush.borrowed}
              applied={!!brush.applied}
              className={cn("min-h-16 flex-col items-start justify-between gap-1.5 rounded-lg px-2 pt-2.5 pb-2 text-left transition-transform duration-(--duration-fast) active:translate-y-0.5 sm:min-h-20", next && "ring-2 ring-foreground ring-offset-2 ring-offset-surface")}
              aria-label={`Add ${a.name}${next ? " (likely next)" : ""}`}
              onClick={() => onPlace(d)}
            >
              {!next && <span className="absolute top-1.5 right-2 font-mono text-2xs opacity-65 pointer-coarse:hidden" aria-hidden>{d}</span>}
              <RomanNumeral a={a} className="text-xl sm:text-2xl" />
              <span className="font-mono text-xs font-semibold whitespace-nowrap opacity-85">{a.name}</span>
              {next && (
                <span className="absolute top-1.5 right-1.5 rounded-xs bg-deg-ink px-1.5 py-px text-2xs font-bold text-surface" aria-hidden>
                  next
                </span>
              )}
            </ChordTile>
          );
        })}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-5 gap-y-3">
        <OptionGroup label="Type" options={TYPE_OPTS} value={brush.type} onChange={(type) => onBrush({ type })} />
        <OptionGroup label="Inversion" options={INV_OPTS.slice(0, maxInversion(brush.type) + 1)} value={brush.inv} onChange={(inv) => onBrush({ inv })} />
        <OptionGroup label="Length" options={durOpts} value={brush.dur} onChange={(dur) => onBrush({ dur })} />
        <OptionGroup
          label="Applied" options={appliedOpts} value={brush.applied}
          isDisabled={(t) => t !== 0 && !canTonicize(t, song.mode, brush.borrowed)}
          onChange={(applied) => onBrush({ applied })}
        />
        <div className="flex flex-col gap-1.5">
          <span className="label-caps">Colour</span>
          <Toggle
            variant="outline" size="sm" className="px-3"
            pressed={brush.borrowed} onPressedChange={(borrowed) => onBrush({ borrowed })}
            title="Take chords from the parallel key"
          >
            Borrowed
          </Toggle>
        </div>
      </div>
    </Panel>
  );
}
