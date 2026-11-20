import { analyzeChord, canTonicize, CHORD_TYPE_LABEL, CHORD_TYPES, LIKELY_NEXT, maxInversion, MODE_LABEL, NOTE_NAMES, PARALLEL, type ChordType } from "../lib/theory";
import { degreeColor } from "../lib/colors";
import type { Song } from "../lib/song";
import type { Brush } from "../state";
import { RomanNumeral } from "./RomanNumeral";
import { Segmented } from "./Segmented";

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
    <section className="card">
      <h2>
        Chords
        <span>{NOTE_NAMES[song.key]} {MODE_LABEL[song.mode].toLowerCase()} · borrowed from {MODE_LABEL[PARALLEL[song.mode]].toLowerCase()}</span>
      </h2>
      <div className="palette">
        {[1, 2, 3, 4, 5, 6, 7].map((d) => {
          const a = analyzeChord({ degree: d, ...brush }, song.key, song.mode);
          return (
            <button
              key={d}
              className={`pbtn${brush.borrowed ? " borrowed" : ""}${brush.applied ? " applied" : ""}${likely.includes(d) ? " next" : ""}`}
              style={{ backgroundColor: degreeColor(d) }}
              aria-label={`Add ${a.name}`}
              onClick={() => onPlace(d)}
            >
              <span className="key">{d}</span>
              <RomanNumeral a={a} />
              <span className="cn">{a.name}</span>
            </button>
          );
        })}
      </div>
      <div className="mods">
        <Segmented label="Type" options={TYPE_OPTS} value={brush.type} onChange={(type) => onBrush({ type })} />
        <Segmented label="Inversion" options={INV_OPTS.slice(0, maxInversion(brush.type) + 1)} value={brush.inv} onChange={(inv) => onBrush({ inv })} />
        <Segmented label="Length" options={durOpts} value={brush.dur} onChange={(dur) => onBrush({ dur })} />
        <Segmented
          label="Applied" options={appliedOpts} value={brush.applied}
          isDisabled={(t) => t !== 0 && !canTonicize(t, song.mode, brush.borrowed)}
          onChange={(applied) => onBrush({ applied })}
        />
        <button className="btn" aria-pressed={brush.borrowed} title="Take chords from the parallel key" onClick={() => onBrush({ borrowed: !brush.borrowed })}>
          Borrowed
        </button>
      </div>
    </section>
  );
}
