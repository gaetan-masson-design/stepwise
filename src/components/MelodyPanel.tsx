import type { ReactNode } from "react";
import { analyzeChord, MODES, mod, NOTE_NAMES, stepToSemitone } from "../lib/theory";
import type { Chord, Note, Song } from "../lib/song";
import { Segmented } from "./Segmented";

interface Props {
  song: Song;
  noteDur: number;
  chord?: Chord;
  note?: Note;
  onNoteDur: (d: number) => void;
  onAccidental: (a: number) => void;
  onDelete: () => void;
}

const NOTE_OPTS = [[0.5, "⅛"], [1, "¼"], [1.5, "¼."], [2, "½"], [4, "1"]] as const;
const ACC_OPTS = [[-1, "♭"], [0, "♮"], [1, "♯"]] as const;

export function MelodyPanel({ song, noteDur, chord, note, onNoteDur, onAccidental, onDelete }: Props) {
  let status: ReactNode;
  if (chord) {
    const a = analyzeChord(chord, song.key, song.mode);
    status = <>Chord <b>{a.numeral}{a.sup}</b> · <b>{a.name}</b> · {chord.dur} beats · bar {Math.floor(chord.start / song.beatsPerBar) + 1}</>;
  } else if (note) {
    const pc = mod(stepToSemitone(MODES[song.mode], note.step) + note.acc + song.key, 12);
    const acc = note.acc < 0 ? "♭" : note.acc > 0 ? "♯" : "";
    status = <>Note <b>{acc}{mod(note.step, 7) + 1}</b> · <b>{NOTE_NAMES[pc]}</b> · {note.dur} beat{note.dur === 1 ? "" : "s"}</>;
  } else {
    status = `${song.chords.length} chords · ${song.notes.length} notes · ${song.bars} bars`;
  }

  return (
    <section className="card">
      <h2>Melody</h2>
      <Segmented label="Note" options={NOTE_OPTS} value={noteDur} onChange={onNoteDur} />
      <Segmented label="Accidental" options={ACC_OPTS} value={note ? note.acc : null} onChange={onAccidental} disabled={!note} />
      <div className="tools">
        <button className="btn" onClick={onDelete} disabled={!chord && !note}>Delete selected</button>
      </div>
      <div className="status">{status}</div>
      <p className="small">
        Rows are scale degrees, so a melody stays correct when you change key. Tinted bands show the tones of the chord
        underneath. Arrow keys move a selected note.
      </p>
    </section>
  );
}
