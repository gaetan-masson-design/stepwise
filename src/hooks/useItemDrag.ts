import { useEffect, useState, type PointerEvent } from "react";
import { BOTTOM_STEP, clearRange, TOP_STEP } from "../lib/song";
import { MIN_DUR } from "../state";

type Kind = "chord" | "note";
interface Item { id: string; start: number; dur: number; step?: number }

interface Drag {
  kind: Kind;
  id: string;
  resize: boolean;
  pointer: number;
  x0: number;
  y0: number;
  orig: { start: number; dur: number; step: number };
  start: number;
  dur: number;
  step: number;
}

interface Options {
  /** Pixels per beat. */
  beatWidth: number;
  /** Pixels per melody row (vertical drags move notes by rows). */
  rowHeight: number;
  /** Song length in beats. */
  total: number;
  /** Items still in the song, so a drag ends if its item is deleted or undone mid-drag. */
  chords: Item[];
  notes: Item[];
  onSelect: (kind: Kind, id: string) => void;
  onPreviewStep: (step: number) => void;
  onEdit: (kind: Kind, id: string, start: number, dur: number, step?: number) => void;
}

/**
 * Dragging an item moves it; dragging its right-edge grip (an element with data-grip) resizes it.
 * Snaps to half beats. One finger at a time.
 */
export function useItemDrag(o: Options) {
  const [drag, setDrag] = useState<Drag | null>(null);

  const handlers = (kind: Kind, item: Item) => ({
    "data-item": kind,
    onPointerDown: (e: PointerEvent<HTMLElement>) => {
      if (e.button !== 0 || drag) return;
      e.stopPropagation();
      o.onSelect(kind, item.id);
      e.currentTarget.setPointerCapture(e.pointerId);
      const orig = { start: item.start, dur: item.dur, step: item.step ?? 0 };
      setDrag({ kind, id: item.id, resize: !!(e.target as HTMLElement).closest("[data-grip]"), pointer: e.pointerId, x0: e.clientX, y0: e.clientY, orig, ...orig });
    },
    onPointerMove: (e: PointerEvent<HTMLElement>) => {
      if (!drag || drag.pointer !== e.pointerId) return;
      const dBeat = Math.round(((e.clientX - drag.x0) / o.beatWidth) * 2) / 2;
      const { orig } = drag;
      if (drag.resize) {
        const dur = Math.max(MIN_DUR, Math.min(o.total - orig.start, orig.dur + dBeat));
        if (dur !== drag.dur) setDrag({ ...drag, dur });
        return;
      }
      const start = Math.max(0, Math.min(o.total - orig.dur, orig.start + dBeat));
      const step = kind === "note"
        ? Math.max(BOTTOM_STEP, Math.min(TOP_STEP, orig.step - Math.round((e.clientY - drag.y0) / o.rowHeight)))
        : 0;
      if (start === drag.start && step === drag.step) return;
      if (step !== drag.step) o.onPreviewStep(step);
      setDrag({ ...drag, start, step });
    },
    onPointerUp: (e: PointerEvent<HTMLElement>) => {
      if (!drag || drag.pointer !== e.pointerId) return;
      const { orig, start, dur, step } = drag;
      setDrag(null);
      if (start !== orig.start || dur !== orig.dur || step !== orig.step)
        o.onEdit(drag.kind, drag.id, start, dur, drag.kind === "note" ? step : undefined);
    },
    onPointerCancel: () => setDrag(null),
    onLostPointerCapture: () => setDrag(null),
  });

  useEffect(() => {
    if (drag && !(drag.kind === "note" ? o.notes : o.chords).some((x) => x.id === drag.id)) setDrag(null);
  }, [drag, o.notes, o.chords]);

  /** The items as the drop would leave them, including trimmed neighbours. */
  const shown = <X extends Item>(items: X[], kind: Kind): X[] => {
    if (!drag || drag.kind !== kind) return items;
    const { start, dur } = drag;
    return clearRange(items, start, start + dur, drag.id)
      .map((x) => (x.id === drag.id ? { ...x, start, dur, ...(kind === "note" ? { step: drag.step } : {}) } : x));
  };

  return { handlers, shown, draggingId: drag?.id };
}
