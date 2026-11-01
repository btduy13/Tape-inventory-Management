"use client";
import { format, getDictionary } from "@/i18n";
import { FONT_FAMILIES, MAX_REPEAT_GAP_PX, MAX_TEXT_LENGTH, MIN_FONT_SIZE_PX } from "../lib/constants";
import { maxFontSize } from "../lib/state";
import { useDesignState } from "./hooks";
import { RangeField } from "./RangeField";

const px = (v: number) => `${Math.round(v)}px`;

export function TextTool() {
  const t = getDictionary().designer;
  const [s, dispatch] = useDesignState();
  const maxFont = maxFontSize(s.preset.width_mm);
  const moved = s.textOffsetX !== 0 || s.textOffsetY !== 0;

  return (
    <fieldset className="flex min-w-0 flex-col gap-3">
      <legend className="mb-1 text-sm font-semibold">{t.text}</legend>
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={s.text}
          maxLength={MAX_TEXT_LENGTH}
          placeholder={t.textPlaceholder}
          onChange={(e) => dispatch({ type: "setText", text: e.target.value })}
          className="min-h-11 min-w-0 flex-1 rounded-md border border-neutral-300 px-3 py-2"
          aria-label={t.text}
          aria-describedby="designer-text-counter"
        />
        <span id="designer-text-counter" className="shrink-0 text-xs tabular-nums text-neutral-500">
          {format(t.textCounter, { count: s.text.length, max: MAX_TEXT_LENGTH })}
        </span>
      </div>
      <label className="flex flex-col gap-1 text-sm">
        {t.font}
        <select
          value={s.fontFamily}
          onChange={(e) => dispatch({ type: "setFontFamily", fontFamily: e.target.value })}
          className="min-h-11 rounded-md border border-neutral-300 px-2 py-2"
        >
          {FONT_FAMILIES.map((f) => (
            <option key={f} value={f}>{f}</option>
          ))}
        </select>
      </label>
      <RangeField
        label={t.fontSize}
        value={Math.min(s.fontSizePx, maxFont)}
        min={MIN_FONT_SIZE_PX}
        max={maxFont}
        display={px}
        onChange={(v) => dispatch({ type: "setFontSize", px: Math.min(v, maxFont) })}
      />
      <RangeField
        label={t.repeatGap}
        value={s.repeatGapPx}
        min={0}
        max={MAX_REPEAT_GAP_PX}
        display={px}
        onChange={(v) => dispatch({ type: "setRepeatGap", px: v })}
      />
      {moved && (
        <button
          type="button"
          onClick={() => dispatch({ type: "setTextOffset", offsetX: 0, offsetY: 0 })}
          className="min-h-11 self-start rounded-md border border-neutral-300 px-3 text-sm hover:border-amber-500"
        >
          {t.textCenter}
        </button>
      )}
    </fieldset>
  );
}
