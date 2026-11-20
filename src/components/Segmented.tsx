interface Props<T extends string | number> {
  label: string;
  options: readonly (readonly [T, string])[];
  value: T | null;
  onChange: (v: T) => void;
  disabled?: boolean;
  /** Disables single options. */
  isDisabled?: (v: T) => boolean;
}

export function Segmented<T extends string | number>({ label, options, value, onChange, disabled, isDisabled }: Props<T>) {
  return (
    <div className="grp">
      <span className="lbl">{label}</span>
      <div className="seg" role="group" aria-label={label}>
        {options.map(([v, text]) => (
          <button key={String(v)} aria-pressed={v === value} disabled={disabled || isDisabled?.(v)} onClick={() => onChange(v)}>
            {text}
          </button>
        ))}
      </div>
    </div>
  );
}
