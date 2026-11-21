import type { ReactNode } from "react";
import { Music2, Redo2, SlidersHorizontal, Trash2, Undo2, type LucideIcon } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Button } from "@/components/ui/button";
import { ChordsIcon } from "./ChordsIcon";

export type Tool = "chords" | "melody" | "sound";

const TOOLS: [Tool, string, LucideIcon | typeof ChordsIcon][] = [
  ["chords", "Chords", ChordsIcon],
  ["melody", "Melody", Music2],
  ["sound", "Sound", SlidersHorizontal],
];

interface Props {
  tool: Tool;
  onTool: (t: Tool) => void;
  canUndo: boolean;
  canRedo: boolean;
  hasSelection: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onDelete: () => void;
  children: ReactNode;
}

/**
 * The bottom of the screen: the selected tool's panel, then the tool switcher within thumb reach.
 * Phase 1's layers slot in here as more tools.
 */
export function ToolDock(p: Props) {
  return (
    <div className="flex flex-col border-t bg-surface pb-(--safe-bottom)">
      <div className="max-h-(--dock-max-h) overflow-y-auto overscroll-contain px-3 pt-3 pb-4 sm:px-4">{p.children}</div>
      <nav className="flex items-center gap-1 border-t px-2 py-1 sm:px-3" aria-label="Tools">
        <ToggleGroup
          type="single" aria-label="Tool" spacing={1} className="min-w-0"
          value={p.tool} onValueChange={(v) => v && p.onTool(v as Tool)}
        >
          {TOOLS.map(([t, label, Icon]) => (
            <ToggleGroupItem key={t} value={t} className="gap-1.5 px-2.5 sm:px-3">
              <Icon className="hidden xs:block" />
              {label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <div className="flex-1" />
        <Button variant="ghost" size="icon" aria-label="Delete selected" disabled={!p.hasSelection} onClick={p.onDelete}><Trash2 /></Button>
        <Button variant="ghost" size="icon" aria-label="Undo" disabled={!p.canUndo} onClick={p.onUndo}><Undo2 /></Button>
        <Button variant="ghost" size="icon" aria-label="Redo" disabled={!p.canRedo} onClick={p.onRedo}><Redo2 /></Button>
      </nav>
    </div>
  );
}
