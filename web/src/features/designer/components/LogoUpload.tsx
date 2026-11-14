"use client";
// Logo section: drop zone + ink count; the logo always prints in its own colours.
// Size / rotation / position sliders sit in a disclosure
// (dragging and the rotate handle on the canvas are the main way).
import { getDictionary } from "@/i18n";
import { MAX_LOGO_OFFSET, MAX_LOGO_ROTATION, MAX_LOGO_SCALE, MAX_OFFSET_X, MIN_LOGO_SCALE } from "../lib/constants";
import { useDesignState } from "./hooks";
import { InkCounter } from "./InkCounter";
import { LogoColorSuggest } from "./LogoColorSuggest";
import { LogoDropzone } from "./LogoDropzone";
import { RangeField } from "./RangeField";
import { btnGhost, focusRing, groupLabel, hint } from "./ui";

const pct = (v: number) => `${Math.round(v * 100)}%`;
const deg = (v: number) => `${Math.round(v)}°`;

type Copy = ReturnType<typeof getDictionary>["designer"];
/** What the automatic clean-up did, in words. */
function cleanupNote(t: Copy, c: { bgRemoved: boolean; trimmed: boolean } | undefined): string {
  if (c?.bgRemoved && c.trimmed) return t.logoCleanBoth;
  if (c?.bgRemoved) return t.logoCleanBg;
  return t.logoCleanTrim;
}

export function LogoUpload() {
  const t = getDictionary().designer;
  const [s, dispatch] = useDesignState();

  return (
    <fieldset className="flex min-w-0 flex-col gap-3">
      <legend className={`${groupLabel} mb-2`}>{t.logo}</legend>
      <LogoDropzone />
      {s.logo && (
        <div className="flex flex-col gap-3">
          {s.logo.alt && (
            <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-lg bg-slate-50 px-3 py-2">
              <input
                type="checkbox"
                checked={!!s.logo.cleaned}
                onChange={(e) => dispatch({ type: "setLogoCleanup", on: e.target.checked })}
                className="mt-0.5 h-5 w-5 shrink-0 accent-vt-navy"
              />
              <span className="flex flex-col gap-0.5 text-sm">
                <span className="font-medium text-slate-900">{t.logoAutoClean}</span>
                <span className={hint}>
                  {s.logo.cleaned ? cleanupNote(t, s.logo.cleanup) : t.logoAutoCleanOff}
                </span>
              </span>
            </label>
          )}
          <p className={hint}>{t.logoOriginalNote}</p>
          <InkCounter />
          <LogoColorSuggest />
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
                label={t.logoRotation}
                value={s.logoRotation}
                min={-MAX_LOGO_ROTATION}
                max={MAX_LOGO_ROTATION}
                display={deg}
                onChange={(v) => dispatch({ type: "setLogoTransform", rotation: v })}
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
                onClick={() => dispatch({ type: "setLogoTransform", scale: 1, offsetX: 0, offsetY: 0, rotation: 0 })}
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
