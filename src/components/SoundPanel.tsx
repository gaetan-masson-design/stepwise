import { STYLE_LABEL, type Mix, type PlayStyle } from "../lib/arrange";
import type { Song } from "../lib/song";
import { Segmented } from "./Segmented";

interface Props {
  song: Song;
  onUpdate: (patch: Partial<Song>, record?: boolean) => void;
}

const STYLE_OPTS = (Object.keys(STYLE_LABEL) as PlayStyle[]).map((s) => [s, STYLE_LABEL[s]] as const);
const TRACKS: [keyof Mix, string][] = [["chords", "Chords"], ["bass", "Bass"], ["melody", "Melody"]];

export function SoundPanel({ song, onUpdate }: Props) {
  return (
    <section className="card">
      <h2>Sound</h2>
      <Segmented label="Chords play" options={STYLE_OPTS} value={song.style} onChange={(style) => onUpdate({ style }, false)} />
      <div className="mixer">
        {TRACKS.map(([k, label]) => (
          <label key={k} className="fader">
            <span className="lbl">{label}</span>
            <input
              type="range" min={0} max={1} step={0.05} value={song.mix[k]}
              onChange={(e) => onUpdate({ mix: { ...song.mix, [k]: Number(e.target.value) } }, false)}
            />
            <span className="val">{song.mix[k] === 0 ? "off" : Math.round(song.mix[k] * 100)}</span>
          </label>
        ))}
      </div>
    </section>
  );
}
