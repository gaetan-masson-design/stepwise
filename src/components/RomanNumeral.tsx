import type { ChordAnalysis } from "../lib/theory";
import { cn } from "@/lib/utils";

/** "vii°7/vi": numeral, raised figures, then the applied target. */
export const RomanNumeral = ({ a, className }: { a: ChordAnalysis; className?: string }) => (
  <span className={cn("leading-none font-extrabold tracking-tight whitespace-nowrap", className)}>
    {a.numeral}
    <sup className="ml-px text-figure font-bold">{a.sup}</sup>
    {a.target && <span className="text-figure font-bold opacity-80">{a.target}</span>}
  </span>
);
