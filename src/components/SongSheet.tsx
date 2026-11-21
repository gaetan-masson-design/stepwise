import { Minus, Plus } from "lucide-react";
import type { Song } from "../lib/song";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  song: Song;
  onTitle: (title: string) => void;
  onBars: (bars: number) => void;
}

const SHORTCUTS: [string, string][] = [
  ["1–7", "add a chord"],
  ["Space", "play or stop"],
  ["⌘Z / ⇧⌘Z", "undo / redo"],
  ["⌘D", "duplicate"],
  ["Delete", "remove the selection"],
  ["Arrows", "move a selected note"],
];

/** Song name and loop length. Slides up from the bottom on phones, in from the side on wider screens. */
export function SongSheet({ open, onOpenChange, song, onTitle, onBars }: Props) {
  const wide = useMediaQuery("(min-width: 640px)");
  const keyboard = useMediaQuery("(pointer: fine)");
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side={wide ? "right" : "bottom"} className="gap-0" onOpenAutoFocus={(e) => !keyboard && e.preventDefault()}>
        <SheetHeader>
          <SheetTitle>Song</SheetTitle>
          <SheetDescription>Name your sketch and set how long the loop is.</SheetDescription>
        </SheetHeader>
        <div className="flex flex-col gap-5 px-4 pb-6">
          <label className="flex flex-col gap-1.5">
            <span className="label-caps">Title</span>
            <Input value={song.title} onChange={(e) => onTitle(e.target.value)} />
          </label>
          <div className="flex flex-col gap-1.5">
            <span className="label-caps">Loop length</span>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" aria-label="Remove a bar" onClick={() => onBars(song.bars - 1)} disabled={song.bars <= 1}><Minus /></Button>
              <span className="min-w-16 text-center font-mono text-lg tabular-nums">{song.bars} bar{song.bars === 1 ? "" : "s"}</span>
              <Button variant="outline" size="icon" aria-label="Add a bar" onClick={() => onBars(song.bars + 1)}><Plus /></Button>
            </div>
            <div className="flex gap-1.5">
              {[4, 8, 16].map((n) => (
                <Button key={n} variant="outline" size="sm" aria-pressed={song.bars === n} onClick={() => onBars(n)}>{n} bars</Button>
              ))}
            </div>
          </div>
          {keyboard && (
            <div className="flex flex-col gap-1.5">
              <span className="label-caps">Keyboard</span>
              <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
                {SHORTCUTS.map(([k, what]) => (
                  <div key={k} className="contents">
                    <dt><kbd className="rounded-xs border border-b-2 bg-surface-2 px-1 font-mono text-xs">{k}</kbd></dt>
                    <dd className="text-muted-foreground">{what}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
