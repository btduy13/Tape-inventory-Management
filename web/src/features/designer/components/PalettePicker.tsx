"use client";
// Palette: background (tape film) and text colour. The logo always prints in its own colours.
// Palette rules live in the reducer; the colour count (tape + text + logo, max 3) in logo-colors.ts.
import { getDictionary } from "@/i18n";
import { isLowContrast } from "../lib/palette";
import { ColorField } from "./ColorField";
import { useDesignState } from "./hooks";
import { InkCounter } from "./InkCounter";
import { hint } from "./ui";

export function PalettePicker() {
  const t = getDictionary().designer;
  const [s, dispatch] = useDesignState();
  const low = isLowContrast(s.textColor, s.backgroundColor);

  return (
    <fieldset className="flex min-w-0 flex-col gap-5">
      <legend className="sr-only">{t.colors}</legend>
      <div className="flex flex-col gap-2">
        <p className={hint}>{t.colorsHint}</p>
        <InkCounter />
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
    </fieldset>
  );
}
