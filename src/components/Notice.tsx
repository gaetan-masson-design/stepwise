import type { ReactNode } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** A gentle one-line message above the dock, with an optional close button. */
export function Notice({ children, tone = "info", onClose }: { children: ReactNode; tone?: "info" | "error"; onClose?: () => void }) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn("flex items-center gap-2 rounded-lg border bg-surface py-1 pr-1 pl-3 text-sm", tone === "error" ? "border-destructive font-semibold" : "border-warning")}
    >
      <div className="flex-1 py-1.5">{children}</div>
      {onClose && <Button variant="ghost" size="icon-sm" aria-label="Dismiss" onClick={onClose}><X /></Button>}
    </div>
  );
}
