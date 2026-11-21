import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** A tool panel in the bottom dock: a small heading and its controls. */
export function Panel({ title, aside, children, className }: { title: string; aside?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn("flex min-w-0 flex-col gap-3", className)} aria-label={title}>
      <h2 className="flex flex-wrap items-baseline justify-between gap-x-2 label-caps">
        {title}
        {aside && <span className="text-sm font-medium tracking-normal normal-case">{aside}</span>}
      </h2>
      {children}
    </section>
  );
}
