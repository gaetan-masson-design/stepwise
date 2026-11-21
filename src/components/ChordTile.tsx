import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

type Props = {
  /** A scale-degree colour token from degreeColor(). */
  color: string;
  borrowed?: boolean;
  applied?: boolean;
} & (({ as: "button" } & ComponentProps<"button">) | ({ as?: "div" } & ComponentProps<"div">));

/**
 * The coloured block that stands for a chord, in the palette and on the timeline.
 * Stripes mark borrowed chords, dots mark applied ones.
 */
export function ChordTile({ color, borrowed, applied, className, style, ...rest }: Props) {
  const cls = cn(
    "relative flex overflow-hidden text-deg-ink shadow-tile select-none",
    applied && borrowed ? "texture-applied-borrowed" : applied ? "texture-applied" : borrowed && "texture-borrowed",
    className,
  );
  const s = { backgroundColor: color, ...style };
  if (rest.as === "button") {
    const { as: _, ...props } = rest;
    return <button type="button" className={cls} style={s} {...props} />;
  }
  const { as: _, ...props } = rest;
  return <div className={cls} style={s} {...props} />;
}
