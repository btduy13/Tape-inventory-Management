"use client";
// Logo section: drop zone + colour mode + size / position controls (canvas drag is the main way).
import { getDictionary } from "@/i18n";
import { MAX_LOGO_OFFSET, MAX_LOGO_SCALE, MAX_OFFSET_X, MIN_LOGO_SCALE } from "../lib/constants";
import { LOGO_COLOR_MODES } from "../lib/state";
import { useDesignState } from "./hooks";
import { LogoDropzone } from "./LogoDropzone";
import { RangeField } from "./RangeField";

const pct = (v: number) => `${Math.round(v * 100)}%`;

export function LogoUpload() {
  const t = getDictionary().designer;
  const [s, dispatch] = useDesignState();
  const modeLabel = { original: t.logoModeOriginal, tint: t.logoModeTint } as const;

  return (
    <fieldset className="flex min-w-0 flex-col gap-3">
      <legend className="mb-1 text-sm font-semibold">{t.logo}</legend>
      <LogoDropzone />
      {s.logo && (
        <div className="flex flex-col gap-3">
          <div role="radiogroup" aria-label={t.logoMode} className="flex flex-wrap gap-2">
            {LOGO_COLOR_MODES.map((m) => (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={s.logoColorMode === m}
                onClick={() => dispatch({ type: "setLogoColorMode", mode: m })}
                className={`min-h-11 rounded-md border px-3 text-sm focus-visible:outline-2 focus-visible:outline-amber-600 ${
                  s.logoColorMode === m ? "border-amber-700 bg-amber-50 font-semibold" : "border-neutral-300"
                }`}
              >
                {modeLabel[m]}
              </button>
            ))}
          </div>
          <p className="text-xs text-neutral-600">{s.logoColorMode === "tint" ? t.logoTintNote : t.logoOriginalNote}</p>
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
            className="min-h-11 self-start rounded-md border border-neutral-300 px-3 text-sm hover:border-amber-500"
          >
            {t.logoCenter}
          </button>
        </div>
      )}
    </fieldset>
  );
}
