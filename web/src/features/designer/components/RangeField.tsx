"use client";
// Slider + number input with visible value and limits (keyboard and touch friendly).
import { useId } from "react";

type Props = {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  /** Display formatter for value / limits (e.g. "86px", "120%"). */
  display?: (v: number) => string;
  onChange: (v: number) => void;
};

export function RangeField({ label, value, min, max, step = 1, display = String, onChange }: Props) {
  const id = useId();
  const v = Math.min(max, Math.max(min, value));
  const emit = (raw: string) => {
    const n = Number(raw);
    if (raw !== "" && Number.isFinite(n)) onChange(n);
  };
  return (
    <div className="flex min-w-0 flex-col gap-1 text-sm">
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={id}>{label}</label>
        <output htmlFor={id} className="font-semibold tabular-nums text-neutral-800">{display(v)}</output>
      </div>
      <div className="flex items-center gap-2">
        <span className="w-10 shrink-0 text-right text-xs tabular-nums text-neutral-500" aria-hidden="true">{display(min)}</span>
        <input
          id={id}
          type="range"
          min={min}
          max={max}
          step={step}
          value={v}
          onChange={(e) => emit(e.target.value)}
          className="h-11 min-w-0 flex-1 accent-amber-700"
        />
        <span className="w-10 shrink-0 text-xs tabular-nums text-neutral-500" aria-hidden="true">{display(max)}</span>
        <input
          type="number"
          min={min}
          max={max}
          step={step}
          value={Number(v.toFixed(2))}
          aria-label={label}
          onChange={(e) => emit(e.target.value)}
          className="h-11 w-20 shrink-0 rounded-md border border-neutral-300 px-2 tabular-nums"
        />
      </div>
    </div>
  );
}
