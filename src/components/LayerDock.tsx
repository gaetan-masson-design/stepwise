import type { ReactNode } from "react";
import { ChevronDown, Redo2, Trash2, Undo2 } from "lucide-react";
import { LAYER_LABEL, type Layer } from "../lib/lanes";
import { Button } from "@/components/ui/button";
import { LAYER_ICON } from "./LoopView";
import { cn } from "@/lib/utils";

interface Props {
  layer: Layer;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canUndo: boolean;
  canRedo: boolean;
  hasSelection: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onDelete: () => void;
  children: ReactNode;
}

/**
 * The bottom of the screen: the selected layer's tools. Tap its header to fold it away so the
 * loop gets the room; undo and redo stay in reach either way.
 */
export function LayerDock(p: Props) {
  const Icon = LAYER_ICON[p.layer];
  return (
    <div className="flex flex-col border-t bg-surface pb-(--safe-bottom)">
      <div className="flex items-center gap-1 px-2 sm:px-3">
        <Button
          variant="ghost"
          className="min-w-0 flex-1 justify-start gap-2 px-2 text-base"
          aria-expanded={p.open}
          aria-controls={p.open ? "layer-tools" : undefined}
          onClick={() => p.onOpenChange(!p.open)}
        >
          <Icon className="size-4" />
          {LAYER_LABEL[p.layer]}
          <span className="sr-only">{p.open ? "tools: tap to fold away" : "tools: tap to show"}</span>
          <ChevronDown className={cn("ml-1 transition-transform duration-(--duration-base)", !p.open && "rotate-180")} aria-hidden />
        </Button>
        <Button variant="ghost" size="icon" aria-label="Delete selected" disabled={!p.hasSelection} onClick={p.onDelete}><Trash2 /></Button>
        <Button variant="ghost" size="icon" aria-label="Undo" disabled={!p.canUndo} onClick={p.onUndo}><Undo2 /></Button>
        <Button variant="ghost" size="icon" aria-label="Redo" disabled={!p.canRedo} onClick={p.onRedo}><Redo2 /></Button>
      </div>
      {p.open && (
        <div id="layer-tools" className="max-h-(--dock-max-h) overflow-y-auto overscroll-contain border-t px-3 pt-3 pb-4 sm:px-4">
          {p.children}
        </div>
      )}
    </div>
  );
}
