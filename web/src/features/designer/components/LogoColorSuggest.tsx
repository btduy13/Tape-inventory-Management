"use client";
// One-tap "text in the logo's colour": the logo's main inks as swatches. Using a logo ink for the
// text adds no ink (logo-colors.ts merges them), so this is the cheapest good-looking choice.
// Hidden when there is no analysed logo, no text, or the text already uses a logo ink.
import { format, getDictionary } from "@/i18n";
import { deltaE, hexToLab, TEXT_LOGO_MATCH_DE } from "../lib/logo-colors";
import { useDesignState } from "./hooks";
import { focusRing, hint } from "./ui";

/** Logo inks offered for the text (largest first), excluding the tape colour. */
const MAX_SUGGESTIONS = 3;

export function LogoColorSuggest() {
  const t = getDictionary().designer;
  const [s, dispatch] = useDesignState();
  const inks = s.logo?.inks;
  if (!inks || inks.length === 0 || !s.text.trim()) return null;
  const textLab = hexToLab(s.textColor);
  if (inks.some((i) => deltaE(hexToLab(i.hex), textLab) < TEXT_LOGO_MATCH_DE)) return null;
  const bgLab = hexToLab(s.backgroundColor);
  const options = inks.filter((i) => deltaE(hexToLab(i.hex), bgLab) >= TEXT_LOGO_MATCH_DE).slice(0, MAX_SUGGESTIONS);
  if (options.length === 0) return null;

  return (
    <div className="flex flex-col gap-2 rounded-lg bg-emerald-50 px-3 py-2 ring-1 ring-emerald-200" data-testid="logo-color-suggest">
      <p className="text-xs font-semibold text-emerald-900">{t.logoColorSuggest}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((i) => (
          <button
            key={i.hex}
            type="button"
            onClick={() => dispatch({ type: "setColor", role: "textColor", color: i.hex })}
            aria-label={format(t.logoColorUse, { hex: i.hex })}
            className={`inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-emerald-300 bg-white px-3 text-sm font-medium text-slate-900 hover:border-emerald-600 ${focusRing}`}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
              <circle cx="9" cy="9" r="8" fill={i.hex} stroke="#94a3b8" />
            </svg>
            <span className="font-mono text-xs uppercase">{i.hex}</span>
          </button>
        ))}
      </div>
      <p className={hint}>{t.logoColorWhy}</p>
    </div>
  );
}
