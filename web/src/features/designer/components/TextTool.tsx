"use client";
import { format, getDictionary } from "@/i18n";
import {
  FONT_FAMILIES, MAX_FONT_SIZE_PX, MAX_REPEAT_GAP_PX, MAX_TEXT_LENGTH, MIN_FONT_SIZE_PX,
} from "../lib/constants";
import { useDesignState } from "./hooks";

export function TextTool() {
  const t = getDictionary().designer;
  const [s, dispatch] = useDesignState();
  const maxFont = Math.min(MAX_FONT_SIZE_PX, Math.round(s.preset.width_mm * 4 * 0.9));

  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="mb-1 text-sm font-semibold">{t.text}</legend>
      <label className="flex flex-col gap-1 text-sm">
        <input
          type="text"
          value={s.text}
          maxLength={MAX_TEXT_LENGTH}
          placeholder={t.textPlaceholder}
          onChange={(e) => dispatch({ type: "setText", text: e.target.value })}
          className="rounded-md border border-neutral-300 px-3 py-2"
          aria-label={t.text}
        />
        <span className="text-xs text-neutral-500">
          {format(t.textCounter, { count: s.text.length, max: MAX_TEXT_LENGTH })}
        </span>
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-sm">
          {t.font}
          <select
            value={s.fontFamily}
            onChange={(e) => dispatch({ type: "setFontFamily", fontFamily: e.target.value })}
            className="rounded-md border border-neutral-300 px-2 py-2"
          >
            {FONT_FAMILIES.map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          {t.fontSize} ({s.fontSizePx}px)
          <input
            type="range"
            min={MIN_FONT_SIZE_PX}
            max={maxFont}
            value={Math.min(s.fontSizePx, maxFont)}
            onChange={(e) => dispatch({ type: "setFontSize", px: Number(e.target.value) })}
          />
        </label>
      </div>
      <label className="flex flex-col gap-1 text-sm">
        {t.repeatGap} ({s.repeatGapPx}px)
        <input
          type="range"
          min={0}
          max={MAX_REPEAT_GAP_PX}
          value={s.repeatGapPx}
          onChange={(e) => dispatch({ type: "setRepeatGap", px: Number(e.target.value) })}
        />
      </label>
    </fieldset>
  );
}
