"use client";
// Logo section: drop zone + colour mode; size / position sliders sit in a disclosure
// (dragging on the canvas is the main way).
import { getDictionary } from "@/i18n";
import { MAX_LOGO_OFFSET, MAX_LOGO_SCALE, MAX_OFFSET_X, MIN_LOGO_SCALE } from "../lib/constants";
import { LOGO_COLOR_MODES } from "../lib/state";
import { useDesignState } from "./hooks";
import { LogoDropzone } from "./LogoDropzone";
import { RangeField } from "./RangeField";
import { btnGhost, chip, chipOff, chipOn, focusRing, groupLabel, hint } from "./ui";

const pct = (v: number) => `${Math.round(v * 100)}%`;

export function LogoUpload() {
  const t = getDictionary().designer;
  const [s, dispatch] = useDesignState();
  const modeLabel = { original: t.logoModeOriginal, tint: t.logoModeTint } as const;

  return (
    <fieldset className="flex min-w-0 flex-col gap-3">
      <legend className={`${groupLabel} mb-2`}>{t.logo}</legend>
      <LogoDropzone />
      {s.logo && (
        <div className="flex flex-col gap-3">
          <div role="radiogroup" aria-label={t.logoMode} className="grid grid-cols-2 gap-2">
            {LOGO_COLOR_MODES.map((m) => (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={s.logoColorMode === m}
                onClick={() => dispatch({ type: "setLogoColorMode", mode: m })}
                className={`${chip} px-3 font-medium ${s.logoColorMode === m ? chipOn : chipOff}`}
              >
                {modeLabel[m]}
              </button>
            ))}
          </div>
          <p className={hint}>{s.logoColorMode === "tint" ? t.logoTintNote : t.logoOriginalNote}</p>
          <details className="group rounded-xl border border-slate-200">
            <summary className={`flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 rounded-xl px-3 text-sm font-medium text-slate-800 hover:bg-slate-50 [&::-webkit-details-marker]:hidden ${focusRing}`}>
              {t.logoAdjust}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="transition-transform duration-200 group-open:rotate-180 motion-reduce:transition-none" aria-hidden="true">
                <path d="m6 9 6 6 6-6" />
              </svg>
            </summary>
            <div className="flex flex-col gap-3 border-t border-slate-100 px-3 pt-2 pb-3">
              <RangeField
                label={t.logoScale}
                value={s.logoScale}
                min={MIN_LOGO_SCALE}
                max={MAX_LOGO_SCALE}
                step={0.05}
                display={pct}
                onChange={(v) => dispatch({ type: "setLogoTransform", scale: v })}
              />
              <RangeField
                label={t.logoOffsetX}
                value={s.logoOffsetX}
                min={-MAX_OFFSET_X}
                max={MAX_OFFSET_X}
                step={0.01}
                display={pct}
                onChange={(v) => dispatch({ type: "setLogoTransform", offsetX: v })}
              />
              <RangeField
                label={t.logoOffsetY}
                value={s.logoOffsetY}
                min={-MAX_LOGO_OFFSET}
                max={MAX_LOGO_OFFSET}
                step={0.01}
                display={pct}
                onChange={(v) => dispatch({ type: "setLogoTransform", offsetY: v })}
              />
              <button
                type="button"
                onClick={() => dispatch({ type: "setLogoTransform", scale: 1, offsetX: 0, offsetY: 0 })}
                className={`${btnGhost} self-start border border-slate-200`}
              >
                {t.logoCenter}
              </button>
            </div>
          </details>
        </div>
      )}
    </fieldset>
  );
}
