"use client";
// One colour role: native colour input + quick swatches (SVG fill, no inline style -> CSP-safe).
// Selected swatch gets a check mark; colours taken by another role are crossed out with a reason.
import { getDictionary } from "@/i18n";
import { SWATCHES } from "../lib/constants";
import { swatchName } from "../lib/swatch-names";
import { focusRing, selectedRing } from "./ui";

type Props = {
  label: string;
  value: string;
  onChange: (hex: string) => void;
  /** Colours already used by other roles (shown disabled). */
  disabledColors?: readonly string[];
  /** Inline badge next to the label (e.g. low contrast). */
  badge?: string | null;
};

export function ColorField({ label, value, onChange, disabledColors = [], badge }: Props) {
  const t = getDictionary().designer;
  const shown = value;
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
        <label className="flex min-w-0 cursor-pointer items-center gap-3">
          <input
            type="color"
            value={shown}
            title={t.customColor}
            onChange={(e) => onChange(e.target.value)}
            className={`h-11 w-11 shrink-0 cursor-pointer rounded-lg border border-slate-300 bg-white p-1 ${focusRing}`}
          />
          <span className="flex min-w-0 flex-col leading-tight">
            <span className="text-sm font-medium text-slate-900">{label}</span>
            <span className="text-xs uppercase tabular-nums text-slate-600">{shown}</span>
          </span>
        </label>
        {badge && <span role="status" className="rounded-md bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900">{badge}</span>}
      </div>
      <div className="grid grid-cols-5 gap-2 sm:grid-cols-10 lg:grid-cols-5" role="group" aria-label={`${label} - ${t.swatches}`}>
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
              className={`relative h-11 min-w-0 cursor-pointer overflow-hidden rounded-lg border transition-shadow duration-150 motion-reduce:transition-none disabled:cursor-not-allowed ${focusRing} ${
                selected ? selectedRing : "border-slate-300 hover:border-slate-500"
              }`}
            >
              <svg className="absolute inset-0 h-full w-full" viewBox="0 0 10 10" preserveAspectRatio="none" aria-hidden="true">
                <rect width="10" height="10" fill={hex} />
                {disabled && <rect width="10" height="10" fill="#ffffff" fillOpacity="0.45" />}
                {disabled && <path d="M0 10L10 0" stroke="#b91c1c" strokeWidth="2" vectorEffect="non-scaling-stroke" />}
              </svg>
              {selected && (
                <svg className="relative mx-auto" width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke={checkStroke(hex)} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
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
