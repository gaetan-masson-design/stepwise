import type { ReactNode } from "react";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

/** A layer's tools in the bottom dock. The dock's header names the layer. */
export function Panel({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <section className={cn("flex min-w-0 flex-col gap-3", className)} aria-label={label}>
      {children}
    </section>
  );
}

/** A plain-words note under a layer's tools. */
export const Hint = ({ children }: { children: ReactNode }) => <p className="max-w-prose text-sm text-muted-foreground">{children}</p>;

/** Volume for one layer, 0..1. */
export function LevelSlider({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex max-w-md items-center gap-3">
      <span className="w-12 shrink-0 label-caps">Level</span>
      <Slider aria-label={`${label} level`} min={0} max={1} step={0.05} value={[value]} onValueChange={([v]) => onChange(v)} />
      <span className="w-10 shrink-0 text-right font-mono text-sm text-muted-foreground tabular-nums">{value === 0 ? "off" : Math.round(value * 100)}</span>
    </div>
  );
}
