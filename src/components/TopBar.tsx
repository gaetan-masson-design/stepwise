import { useRef, useState } from "react";
import { Download, EllipsisVertical, FolderOpen, Music, Play, RotateCcw, Settings2, Sparkles, Square } from "lucide-react";
import { keyName, MODE_LABEL, MODES, type Mode } from "../lib/theory";
import type { Song } from "../lib/song";
import type { ThemeChoice } from "../lib/theme";
import { degreeColor } from "../lib/colors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuRadioGroup,
  DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Props {
  song: Song;
  playing: boolean;
  theme: ThemeChoice;
  onPlay: () => void;
  onUpdate: (patch: Partial<Song>, record?: boolean) => void;
  onSongSettings: () => void;
  onTheme: (t: ThemeChoice) => void;
  onExample: () => void;
  onClear: () => void;
  onExportMidi: () => void;
  onExportJson: () => void;
  onImport: (file: File) => void;
}

const KEYS = Array.from({ length: 12 }, (_, i) => i);

/** The brand mark: five rising steps in the first five degree colours. */
export const Logo = () => (
  <span className="inline-flex h-4 items-end gap-0.5" aria-hidden>
    {[1, 2, 3, 4, 5].map((d) => (
      <i key={d} className="block w-1.25 rounded-xs" style={{ height: `${37.5 + d * 12.5}%`, background: degreeColor(d) }} />
    ))}
  </span>
);

/** Top bar: play, key and tempo, plus a menu for everything else. */
export function TopBar(p: Props) {
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
    <header className="flex items-center gap-1.5 border-b bg-surface px-3 py-1.5 sm:gap-2 sm:px-4">
      <div className="mr-1 hidden items-baseline gap-2 text-xl font-extrabold tracking-tight md:flex">
        <Logo />
        Stepwise
      </div>

      <Button onClick={p.onPlay} className="w-touch shrink-0 px-0 sm:w-auto sm:px-4" aria-label={p.playing ? "Stop" : "Play"}>
        {p.playing ? <Square className="fill-current" /> : <Play className="fill-current" />}
        <span className="hidden sm:inline">{p.playing ? "Stop" : "Play"}</span>
      </Button>

      <Select value={String(song.key)} onValueChange={(v) => p.onUpdate({ key: Number(v) })}>
        <SelectTrigger aria-label="Key" className="shrink-0 px-2.5 sm:px-3">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {KEYS.map((k) => <SelectItem key={k} value={String(k)}>{keyName(k, song.mode)}</SelectItem>)}
        </SelectContent>
      </Select>
      <Select value={song.mode} onValueChange={(v) => p.onUpdate({ mode: v as Mode })}>
        <SelectTrigger aria-label="Mode" className="min-w-0 px-2.5 sm:px-3">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {(Object.keys(MODES) as Mode[]).map((m) => <SelectItem key={m} value={m}>{MODE_LABEL[m]}</SelectItem>)}
        </SelectContent>
      </Select>

      <label className="flex shrink-0 items-center gap-1.5">
        <span className="sr-only label-caps sm:not-sr-only">BPM</span>
        <Input
          aria-label="Tempo in BPM"
          className="w-14 px-1.5 text-center font-mono tabular-nums sm:w-16"
          inputMode="numeric" enterKeyHint="done"
          value={bpm ?? song.bpm}
          onChange={(e) => setBpm(e.target.value)}
          onFocus={(e) => e.target.select()}
          onBlur={commitBpm}
          onKeyDown={(e) => e.key === "Enter" && (e.currentTarget.blur(), commitBpm())}
        />
      </label>

      <button
        type="button"
        className="ml-2 hidden min-w-0 flex-1 truncate rounded-md px-2 py-1 text-left text-lg font-semibold hover:bg-accent lg:block"
        onClick={p.onSongSettings}
        title="Rename or resize the song"
      >
        {song.title}
      </button>
      <div className="flex-1 lg:hidden" />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Menu" className="shrink-0">
            <EllipsisVertical />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem onSelect={p.onSongSettings}><Settings2 /> Song settings…</DropdownMenuItem>
          <DropdownMenuCheckboxItem checked={song.loop} onCheckedChange={(loop) => p.onUpdate({ loop }, false)} onSelect={(e) => e.preventDefault()}>
            Loop playback
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem checked={song.metronome} onCheckedChange={(metronome) => p.onUpdate({ metronome }, false)} onSelect={(e) => e.preventDefault()}>
            Click track
          </DropdownMenuCheckboxItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={p.onExportMidi}><Music /> Export MIDI</DropdownMenuItem>
          <DropdownMenuItem onSelect={p.onExportJson}><Download /> Save file</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => fileRef.current?.click()}><FolderOpen /> Open file…</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={p.onExample}><Sparkles /> Load the example</DropdownMenuItem>
          <DropdownMenuItem onSelect={p.onClear}><RotateCcw /> Start over</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuLabel className="label-caps">Theme</DropdownMenuLabel>
          <DropdownMenuRadioGroup value={p.theme} onValueChange={(v) => p.onTheme(v as ThemeChoice)}>
            <DropdownMenuRadioItem value="system">Match my device</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="light">Light</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="dark">Dark</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      <input
        ref={fileRef} type="file" accept=".json,application/json" hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) p.onImport(f);
          e.target.value = "";
        }}
      />
    </header>
  );
}
