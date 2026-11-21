import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";

interface Props<T extends string | number> {
  label: string;
  options: readonly (readonly [T, string])[];
  value: T | null;
  onChange: (v: T) => void;
  disabled?: boolean;
  /** Disables single options. */
  isDisabled?: (v: T) => boolean;
  className?: string;
}

/** A labelled row of choices where exactly one is on. Wraps on narrow screens. */
export function OptionGroup<T extends string | number>({ label, options, value, onChange, disabled, isDisabled, className }: Props<T>) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1.5", className)}>
      <span className="label-caps">{label}</span>
      <ToggleGroup
        type="single"
        variant="outline"
        size="sm"
        spacing={1}
        aria-label={label}
        className="flex-wrap"
        value={value === null ? "" : String(value)}
        disabled={disabled}
        onValueChange={(v) => {
          // Tapping the option that's already on would clear it; keep one on.
          const opt = options.find(([o]) => String(o) === v);
          if (opt) onChange(opt[0]);
        }}
      >
        {options.map(([v, text]) => (
          <ToggleGroupItem key={String(v)} value={String(v)} disabled={isDisabled?.(v)} className="px-3">
            {text}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  );
}
