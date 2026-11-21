import { STYLE_LABEL, type Mix, type PlayStyle } from "../lib/arrange";
import type { Song } from "../lib/song";
import { OptionGroup } from "./OptionGroup";
import { Hint, LevelSlider, Panel } from "./Panel";

interface Props {
  song: Song;
  onUpdate: (patch: Partial<Song>, record?: boolean) => void;
}

const STYLE_OPTS = (Object.keys(STYLE_LABEL) as PlayStyle[]).map((s) => [s, STYLE_LABEL[s]] as const);
const setLevel = (p: Props, k: keyof Mix) => (v: number) => p.onUpdate({ mix: { ...p.song.mix, [k]: v } }, false);

/** How the pads play the chords, and their level. Shown under the chord palette. */
export const PadSound = (p: Props) => (
  <div className="flex flex-col gap-3 border-t pt-3">
    <OptionGroup label="Pads play" options={STYLE_OPTS} value={p.song.style} onChange={(style) => p.onUpdate({ style }, false)} />
    <LevelSlider label="Pads" value={p.song.mix.chords} onChange={setLevel(p, "chords")} />
  </div>
);

export function ArpPanel(p: Props) {
  return (
    <Panel label="Arp">
      <Hint>
        The arp walks up and down the notes of each chord. The lane shows the pattern it starts from. Its own sound and
        patterns (up, down, up-down, random) arrive with the next update.
      </Hint>
      <Hint>To hear it today, have the pads play it: pick Arpeggio below (Block or Pulse goes back).</Hint>
      <OptionGroup label="Pads play" options={STYLE_OPTS} value={p.song.style} onChange={(style) => p.onUpdate({ style }, false)} />
    </Panel>
  );
}

export function BassPanel(p: Props) {
  return (
    <Panel label="Bass">
      <LevelSlider label="Bass" value={p.song.mix.bass} onChange={setLevel(p, "bass")} />
      <Hint>The bass plays the lowest note of each chord. Patterns such as a held home note or offbeats come with the next update.</Hint>
    </Panel>
  );
}
