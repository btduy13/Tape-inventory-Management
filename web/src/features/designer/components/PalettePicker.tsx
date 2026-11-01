"use client";
// Max-3-colour palette: background, text, optional accent (logo ink). Rules live in the reducer.
import { format, getDictionary } from "@/i18n";
import { MAX_COLORS } from "../lib/constants";
import { isLowContrast, paletteColors } from "../lib/palette";
import { ColorField } from "./ColorField";
import { useDesignState } from "./hooks";
import { btnGhost, hint } from "./ui";

export function PalettePicker() {
  const t = getDictionary().designer;
  const [s, dispatch] = useDesignState();
  const used = paletteColors(s);
  const low = isLowContrast(s.textColor, s.backgroundColor);

  return (
    <fieldset className="flex min-w-0 flex-col gap-5">
      <legend className="sr-only">{t.colors}</legend>
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2">
        <p className={hint}>{t.colorsHint}</p>
        <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-900 tabular-nums" aria-live="polite">
          <span className="flex gap-0.5" aria-hidden="true">
            {Array.from({ length: MAX_COLORS }, (_, i) => (
              <svg key={i} width="10" height="10" viewBox="0 0 10 10">
                <circle cx="5" cy="5" r="4.5" fill={used[i] ?? "#ffffff"} stroke="#94a3b8" />
              </svg>
            ))}
          </span>
          {format(t.colorsUsed, { count: used.length, max: MAX_COLORS })}
        </p>
      </div>
      <ColorField
        label={t.backgroundColor}
        value={s.backgroundColor}
        disabledColors={[s.textColor]}
        onChange={(c) => dispatch({ type: "setColor", role: "backgroundColor", color: c })}
      />
      <ColorField
        label={t.textColor}
        value={s.textColor}
        disabledColors={[s.backgroundColor]}
        badge={low ? t.lowContrast : null}
        onChange={(c) => dispatch({ type: "setColor", role: "textColor", color: c })}
      />
      <div className="flex min-w-0 flex-col gap-2">
        <ColorField
          label={t.accentColor}
          value={s.accentColor}
          fallbackValue={s.textColor}
          fallbackNote={t.accentFallback}
          disabledColors={[s.backgroundColor, s.textColor]}
          onChange={(c) => dispatch({ type: "setColor", role: "accentColor", color: c })}
        />
        {s.accentColor && (
          <button
            type="button"
            onClick={() => dispatch({ type: "setColor", role: "accentColor", color: null })}
            className={`${btnGhost} self-start px-2 underline underline-offset-2`}
          >
            {t.accentNone}
          </button>
        )}
      </div>
    </fieldset>
  );
}
