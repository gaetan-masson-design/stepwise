import type { ReactNode } from "react";
import { CopyPlus, Maximize2, Trash2 } from "lucide-react";
import { analyzeChord, mod, stepName } from "../lib/theory";
import type { Chord, Note, Song } from "../lib/song";
import { OptionGroup } from "./OptionGroup";
import { Hint, LevelSlider, Panel } from "./Panel";
import { Button } from "@/components/ui/button";

interface Props {
  song: Song;
  noteDur: number;
  chord?: Chord;
  note?: Note;
  onNoteDur: (d: number) => void;
  onAccidental: (a: number) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  editorOpen: boolean;
  onOpenEditor: () => void;
  onLevel: (v: number) => void;
}

const NOTE_OPTS = [[0.5, "⅛"], [1, "¼"], [1.5, "¼."], [2, "½"], [4, "1"]] as const;
const ACC_OPTS = [[-1, "♭"], [0, "♮"], [1, "♯"]] as const;

/** One line about the selection, or the song when nothing is selected. */
export function selectionStatus(song: Song, chord?: Chord, note?: Note): ReactNode {
  if (chord) {
    const a = analyzeChord(chord, song.key, song.mode);
    return <>Chord <b className="text-foreground">{a.numeral}{a.sup}{a.target}</b> · <b className="text-foreground">{a.name}</b> · {chord.dur} beats · bar {Math.floor(chord.start / song.beatsPerBar) + 1}</>;
  }
  if (note) {
    const acc = note.acc < 0 ? "♭" : note.acc > 0 ? "♯" : "";
    return <>Note <b className="text-foreground">{acc}{mod(note.step, 7) + 1}</b> · <b className="text-foreground">{stepName(note.step, note.acc, song.key, song.mode)}</b> · {note.dur} beat{note.dur === 1 ? "" : "s"}</>;
  }
  return `${song.chords.length} chords · ${song.notes.length} notes · ${song.bars} bars`;
}

export function MelodyPanel({ song, noteDur, chord, note, onNoteDur, onAccidental, onDelete, onDuplicate, editorOpen, onOpenEditor, onLevel }: Props) {
  return (
    <Panel label="Melody">
      {!editorOpen && (
        <div>
          <Button size="sm" onClick={onOpenEditor}><Maximize2 /> Edit the melody</Button>
        </div>
      )}
      <div className="flex flex-wrap gap-x-5 gap-y-3">
        <OptionGroup label="Note length" options={NOTE_OPTS} value={noteDur} onChange={onNoteDur} />
        <OptionGroup label="Sharp or flat" options={ACC_OPTS} value={note ? note.acc : null} onChange={onAccidental} disabled={!note} />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" onClick={onDuplicate} disabled={!chord && !note}><CopyPlus /> Duplicate</Button>
        <Button variant="outline" size="sm" onClick={onDelete} disabled={!chord && !note}><Trash2 /> Delete</Button>
        <span className="font-mono text-sm text-muted-foreground">{selectionStatus(song, chord, note)}</span>
      </div>
      <LevelSlider label="Melody" value={song.mix.melody} onChange={onLevel} />
      <Hint>
        {editorOpen
          ? "Tap the grid to add a note, drag to move it, drag its right edge to make it longer. Rows are steps of the scale, so the melody follows any key change. Tinted rows are the notes of the chord underneath."
          : "Open the editor to write notes one or two bars at a time."}
      </Hint>
    </Panel>
  );
}
