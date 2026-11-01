"use client";
// Max-3-colour palette: background, text, optional accent (logo ink). Rules live in the reducer.
import { format, getDictionary } from "@/i18n";
import { MAX_COLORS } from "../lib/constants";
import { isLowContrast, paletteColors } from "../lib/palette";
import { ColorField } from "./ColorField";
import { useDesignState } from "./hooks";

export function PalettePicker() {
  const t = getDictionary().designer;
  const [s, dispatch] = useDesignState();
  const used = paletteColors(s);
  const low = isLowContrast(s.textColor, s.backgroundColor);

  return (
    <fieldset className="flex min-w-0 flex-col gap-3">
      <legend className="mb-1 text-sm font-semibold">{t.colors}</legend>
      <p className="text-xs text-neutral-600" aria-live="polite">
        {format(t.colorsUsed, { count: used.length, max: MAX_COLORS })}
      </p>
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
          className="min-h-11 self-start text-xs text-amber-800 underline"
        >
          {t.accentNone}
        </button>
      )}
    </fieldset>
  );
}
