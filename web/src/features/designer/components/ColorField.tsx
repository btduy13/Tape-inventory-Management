"use client";
// One colour role: native colour input + quick swatches (SVG fill, no inline style -> CSP-safe).
// Selected swatch gets a check mark; colours taken by another role are crossed out with a reason.
import { getDictionary } from "@/i18n";
import { SWATCHES } from "../lib/constants";
import { swatchName } from "../lib/swatch-names";

type Props = {
  label: string;
  value: string | null;
  onChange: (hex: string) => void;
  /** Colour shown when `value` is null (e.g. accent falls back to the text colour). */
  fallbackValue?: string;
  /** Note shown when `value` is null. */
  fallbackNote?: string;
  /** Colours already used by other roles (shown disabled). */
  disabledColors?: readonly string[];
  /** Inline badge next to the label (e.g. low contrast). */
  badge?: string | null;
};

export function ColorField({ label, value, onChange, fallbackValue, fallbackNote, disabledColors = [], badge }: Props) {
  const t = getDictionary().designer;
  const shown = value ?? fallbackValue ?? "#000000";
  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <label className="flex items-center gap-2">
          <input
            type="color"
            value={shown}
            onChange={(e) => onChange(e.target.value)}
            className="h-11 w-11 cursor-pointer rounded border border-neutral-300"
          />
          <span>{label}</span>
        </label>
        {value === null && fallbackNote && <span className="text-xs text-neutral-500">{fallbackNote}</span>}
        {badge && <span role="status" className="rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900">{badge}</span>}
      </div>
      <div className="flex flex-wrap gap-1" role="group" aria-label={`${label} - ${t.swatches}`}>
        {SWATCHES.map((hex) => {
          const disabled = disabledColors.includes(hex);
          const selected = value === hex;
          const name = swatchName(hex);
          const title = disabled ? `${name} - ${t.swatchTaken}` : name;
          return (
            <button
              key={hex}
              type="button"
              title={title}
              aria-label={title}
              aria-pressed={selected}
              disabled={disabled}
              onClick={() => onChange(hex)}
              className={`relative flex h-11 w-11 items-center justify-center rounded border focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600 disabled:cursor-not-allowed ${
                selected ? "border-amber-700 ring-2 ring-amber-500" : "border-neutral-300"
              }`}
            >
              <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true">
                <rect width="28" height="28" rx="3" fill={hex} stroke="#a3a3a3" strokeWidth="1" />
                {selected && <path d="M7 14.5l4.5 4.5L21 9" fill="none" stroke={checkStroke(hex)} strokeWidth="3" />}
                {disabled && <path d="M3 25L25 3" stroke="#b91c1c" strokeWidth="2.5" />}
              </svg>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Black or white check depending on swatch brightness. */
function checkStroke(hex: string): string {
  const n = Number.parseInt(hex.slice(1), 16);
  const lum = 0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255);
  return lum > 150 ? "#000000" : "#ffffff";
}
