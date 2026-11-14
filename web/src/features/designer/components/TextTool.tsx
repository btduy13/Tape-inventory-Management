"use client";
// Print text: content (up to MAX_TEXT_LINES lines, Enter = new line), font (grouped radio tiles
// previewed in each font via SVG attributes, CSP-safe; catalog in lib/fonts.ts) and size. Text colour lives in the colour step; repeat gap lives in PatternPicker.
import { useId } from "react";
import { format, getDictionary } from "@/i18n";
import { FONT_FAMILIES, MAX_TEXT_LENGTH, MAX_TEXT_LINES, MIN_FONT_SIZE_PX } from "../lib/constants";
import { FONT_GROUPS, FONT_META, fontCss, fontWeight } from "../lib/fonts";
import { maxFontSize } from "../lib/state";
import { useDesignState } from "./hooks";
import { RangeField } from "./RangeField";
import { btnGhost, chip, chipOff, chipOn, groupLabel, hint, input } from "./ui";

const px = (v: number) => `${Math.round(v)}px`;

export function TextTool() {
  const t = getDictionary().designer;
  const id = useId();
  const [s, dispatch] = useDesignState();
  const maxFont = maxFontSize(s.preset.width_mm);
  const moved = s.textOffsetX !== 0 || s.textOffsetY !== 0;
  const rows = Math.min(MAX_TEXT_LINES, Math.max(2, s.text.split("\n").length));

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex min-w-0 flex-col gap-2">
        <div className="flex items-baseline justify-between gap-2">
          <label htmlFor={`${id}-text`} className={groupLabel}>{t.text}</label>
          <span id={`${id}-counter`} className="text-xs tabular-nums text-slate-600">
            {format(t.textCounter, { count: s.text.length, max: MAX_TEXT_LENGTH })}
          </span>
        </div>
        <textarea
          id={`${id}-text`}
          value={s.text}
          rows={rows}
          maxLength={MAX_TEXT_LENGTH}
          placeholder={t.textPlaceholder}
          onChange={(e) => dispatch({ type: "setText", text: e.target.value })}
          className={`${input.replace("h-11", "")} min-h-11 resize-none py-2 leading-6`}
          aria-describedby={`${id}-counter ${id}-lines`}
        />
        <p id={`${id}-lines`} className={hint}>{format(t.textLinesHint, { max: MAX_TEXT_LINES })}</p>
      </div>
      <div className="flex min-w-0 flex-col gap-2">
        <span id={`${id}-font`} className="text-sm font-medium text-slate-800">{t.font}</span>
        <div role="radiogroup" aria-labelledby={`${id}-font`} className="flex min-w-0 flex-col gap-3">
          {FONT_GROUPS.map((g) => (
            <div key={g} className="flex min-w-0 flex-col gap-1.5">
              <span className="text-xs font-medium text-slate-600">{t.fontGroups[g]}</span>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4">
                {FONT_FAMILIES.filter((f) => FONT_META[f].group === g).map((f) => {
                  const on = s.fontFamily === f;
                  return (
                    <button
                      key={f}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      aria-label={f}
                      data-font={f}
                      onClick={() => dispatch({ type: "setFontFamily", fontFamily: f })}
                      className={`${chip} h-16 flex-col gap-0.5 px-1 ${on ? chipOn : chipOff}`}
                    >
                      {/* Sample in the font itself (SVG attributes: CSP-safe); also fetches the web font. */}
                      <svg width="96" height="26" viewBox="0 0 96 26" className="max-w-full" aria-hidden="true">
                        <text x="48" y="19" textAnchor="middle" fontSize="17" fontWeight={fontWeight(f)} fontFamily={fontCss(f)} fill="currentColor">
                          {t.fontPreview}
                        </text>
                      </svg>
                      <span className="w-full truncate text-center text-xs leading-4">{FONT_META[f].label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
      <RangeField
        label={t.fontSize}
        value={Math.min(s.fontSizePx, maxFont)}
        min={MIN_FONT_SIZE_PX}
        max={maxFont}
        display={px}
        onChange={(v) => dispatch({ type: "setFontSize", px: Math.min(v, maxFont) })}
      />
      {moved && (
        <button
          type="button"
          onClick={() => dispatch({ type: "setTextOffset", offsetX: 0, offsetY: 0 })}
          className={`${btnGhost} self-start border border-slate-200`}
        >
          {t.textCenter}
        </button>
      )}
    </div>
  );
}
