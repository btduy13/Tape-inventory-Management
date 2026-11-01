"use client";
// Slider + number input with visible value (keyboard and touch friendly).
import { useId } from "react";
import { focusRing } from "./ui";

type Props = {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  /** Display formatter for the value (e.g. "86px", "120%"). */
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
    <div className="flex min-w-0 flex-col gap-1">
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <label htmlFor={id} className="font-medium text-slate-800">{label}</label>
        <output htmlFor={id} className="text-xs tabular-nums text-slate-600">
          {display(min)} – {display(max)}
        </output>
      </div>
      <div className="flex items-center gap-3">
        <input
          id={id}
          type="range"
          min={min}
          max={max}
          step={step}
          value={v}
          aria-valuetext={display(v)}
          onChange={(e) => emit(e.target.value)}
          className={`h-11 min-w-0 flex-1 cursor-pointer accent-slate-900 ${focusRing}`}
        />
        <input
          type="number"
          min={min}
          max={max}
          step={step}
          value={Number(v.toFixed(2))}
          aria-label={label}
          onChange={(e) => emit(e.target.value)}
          className="h-11 w-20 shrink-0 rounded-lg border border-slate-300 bg-white px-2 text-right text-base tabular-nums text-slate-900 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/15"
        />
      </div>
    </div>
  );
}
