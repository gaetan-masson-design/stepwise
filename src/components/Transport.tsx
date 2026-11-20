import { useRef, useState } from "react";
import { MODE_LABEL, MODES, NOTE_NAMES, type Mode } from "../lib/theory";
import type { Song } from "../lib/song";

interface Props {
  song: Song;
  playing: boolean;
  canUndo: boolean;
  onPlay: () => void;
  onUpdate: (patch: Partial<Song>, record?: boolean) => void;
  onBars: (bars: number) => void;
  onUndo: () => void;
  onExample: () => void;
  onClear: () => void;
  onExportMidi: () => void;
  onExportJson: () => void;
  onImport: (file: File) => void;
}

export function Transport(p: Props) {
  const { song } = p;
  const fileRef = useRef<HTMLInputElement>(null);
  const [bpm, setBpm] = useState<string | null>(null);
  const commitBpm = () => {
    if (bpm === null) return;
    const v = Math.max(40, Math.min(240, Math.round(Number(bpm)) || song.bpm));
    setBpm(null);
    if (v !== song.bpm) p.onUpdate({ bpm: v });
  };

  return (
    <div className="transport">
      <button className="btn play" onClick={p.onPlay}>
        <span aria-hidden>{p.playing ? "■" : "▶"}</span>
        {p.playing ? "Stop" : "Play"}
      </button>
      <button className="btn" aria-pressed={song.loop} onClick={() => p.onUpdate({ loop: !song.loop }, false)}>Loop</button>
      <button className="btn" aria-pressed={song.metronome} onClick={() => p.onUpdate({ metronome: !song.metronome }, false)}>Click</button>
      <div className="sep" />
      <label className="grp">
        <span className="lbl">BPM</span>
        <input
          id="bpm" className="num" type="number" min={40} max={240}
          value={bpm ?? song.bpm}
          onChange={(e) => setBpm(e.target.value)}
          onBlur={commitBpm}
          onKeyDown={(e) => e.key === "Enter" && commitBpm()}
        />
      </label>
      <div className="grp">
        <span className="lbl">Key</span>
        <select id="key" aria-label="Key" value={song.key} onChange={(e) => p.onUpdate({ key: Number(e.target.value) })}>
          {NOTE_NAMES.map((n, i) => <option key={n} value={i}>{n}</option>)}
        </select>
        <select id="mode" aria-label="Mode" value={song.mode} onChange={(e) => p.onUpdate({ mode: e.target.value as Mode })}>
          {(Object.keys(MODES) as Mode[]).map((m) => <option key={m} value={m}>{MODE_LABEL[m]}</option>)}
        </select>
      </div>
      <div className="grp">
        <span className="lbl">Bars</span>
        <button className="btn" aria-label="Remove a bar" onClick={() => p.onBars(song.bars - 1)}>−</button>
        <span className="bars">{song.bars}</span>
        <button className="btn" aria-label="Add a bar" onClick={() => p.onBars(song.bars + 1)}>+</button>
      </div>
      <div className="sep" />
      <button className="btn" onClick={p.onUndo} disabled={!p.canUndo}>Undo</button>
      <button className="btn" onClick={p.onExample}>Example</button>
      <button className="btn" onClick={p.onClear}>Clear</button>
      <div className="sep" />
      <button className="btn" onClick={p.onExportMidi}>Export MIDI</button>
      <button className="btn" onClick={p.onExportJson}>Save file</button>
      <button className="btn" onClick={() => fileRef.current?.click()}>Open file</button>
      <input
        ref={fileRef} type="file" accept=".json,application/json" hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) p.onImport(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}
