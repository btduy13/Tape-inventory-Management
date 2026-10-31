"use client";
// One colour role: native colour input + quick swatches (SVG fill, no inline style -> CSP-safe).
import { getDictionary } from "@/i18n";
import { SWATCHES } from "../lib/constants";

type Props = {
  label: string;
  value: string | null;
  onChange: (hex: string) => void;
  /** Colours already used by other roles (shown disabled). */
  disabledColors?: readonly string[];
};

export function ColorField({ label, value, onChange, disabledColors = [] }: Props) {
  const t = getDictionary().designer;
  return (
    <div className="flex flex-col gap-1">
      <label className="flex items-center gap-2 text-sm">
        <input
          type="color"
          value={value ?? "#000000"}
          onChange={(e) => onChange(e.target.value)}
          className="h-8 w-10 cursor-pointer rounded border border-neutral-300"
        />
        <span>{label}</span>
      </label>
      <div className="flex flex-wrap gap-1" aria-label={`${label} - ${t.swatches}`}>
        {SWATCHES.map((hex) => {
          const disabled = disabledColors.includes(hex);
          return (
            <button
              key={hex}
              type="button"
              title={hex}
              aria-label={hex}
              aria-pressed={value === hex}
              disabled={disabled}
              onClick={() => onChange(hex)}
              className={`rounded border ${value === hex ? "border-amber-700 ring-2 ring-amber-500" : "border-neutral-300"} disabled:opacity-30`}
            >
              <svg width="20" height="20" aria-hidden="true">
                <rect width="20" height="20" fill={hex} />
              </svg>
            </button>
          );
        })}
      </div>
    </div>
  );
}
