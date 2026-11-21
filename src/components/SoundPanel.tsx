import { STYLE_LABEL, type Mix, type PlayStyle } from "../lib/arrange";
import type { Song } from "../lib/song";
import { OptionGroup } from "./OptionGroup";
import { Panel } from "./Panel";
import { Slider } from "@/components/ui/slider";
import { Toggle } from "@/components/ui/toggle";

interface Props {
  song: Song;
  onUpdate: (patch: Partial<Song>, record?: boolean) => void;
}

const STYLE_OPTS = (Object.keys(STYLE_LABEL) as PlayStyle[]).map((s) => [s, STYLE_LABEL[s]] as const);
const TRACKS: [keyof Mix, string][] = [["chords", "Chords"], ["bass", "Bass"], ["melody", "Melody"]];

export function SoundPanel({ song, onUpdate }: Props) {
  return (
    <Panel title="Sound">
      <div className="flex flex-wrap gap-x-5 gap-y-3">
        <OptionGroup label="Chords play" options={STYLE_OPTS} value={song.style} onChange={(style) => onUpdate({ style }, false)} />
        <div className="flex flex-col gap-1.5">
          <span className="label-caps">Playback</span>
          <div className="flex gap-1">
            <Toggle variant="outline" size="sm" className="px-3" pressed={song.loop} onPressedChange={(loop) => onUpdate({ loop }, false)}>Loop</Toggle>
            <Toggle variant="outline" size="sm" className="px-3" pressed={song.metronome} onPressedChange={(metronome) => onUpdate({ metronome }, false)}>Click</Toggle>
          </div>
        </div>
      </div>
      <div className="flex max-w-md flex-col gap-1">
        <span className="label-caps">Levels</span>
        {TRACKS.map(([k, label]) => (
          <div key={k} className="flex items-center gap-3">
            <span className="w-16 shrink-0 text-sm font-semibold">{label}</span>
            <Slider
              aria-label={`${label} level`}
              min={0} max={1} step={0.05} value={[song.mix[k]]}
              onValueChange={([v]) => onUpdate({ mix: { ...song.mix, [k]: v } }, false)}
            />
            <span className="w-10 shrink-0 text-right font-mono text-sm text-muted-foreground tabular-nums">
              {song.mix[k] === 0 ? "off" : Math.round(song.mix[k] * 100)}
            </span>
          </div>
        ))}
      </div>
    </Panel>
  );
}
