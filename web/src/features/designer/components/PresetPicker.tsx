"use client";
import { format, getDictionary } from "@/i18n";
import { presetKey } from "../lib/presets";
import { useDesignContext } from "./DesignProvider";
import { useDesignState } from "./hooks";

export function PresetPicker() {
  const t = getDictionary().designer;
  const { presets } = useDesignContext();
  const [state, dispatch] = useDesignState();
  const current = presetKey(state.preset);
  const widest = Math.max(...presets.map((p) => p.width_mm));

  return (
    <fieldset className="flex min-w-0 flex-col gap-2">
      <legend className="mb-1 text-sm font-semibold">{t.preset}</legend>
      <div role="radiogroup" aria-label={t.preset} className="grid grid-cols-2 gap-2">
        {presets.map((p) => {
          const key = presetKey(p);
          const selected = key === current;
          // Mini strip: height proportional to tape width (max 20px).
          const h = Math.max(6, Math.round((p.width_mm / widest) * 20));
          return (
            <button
              key={key}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={format(t.presetDims, { width: p.width_mm, length: p.length_m, thickness: p.thickness_mic })}
              onClick={() => dispatch({ type: "setPreset", preset: p })}
              className={`flex min-h-11 min-w-0 items-center gap-2 rounded-md border px-3 py-2 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600 ${
                selected ? "border-amber-700 bg-amber-50" : "border-neutral-300 hover:border-amber-500"
              }`}
            >
              <svg width="28" height="20" viewBox="0 0 28 20" aria-hidden="true" className="shrink-0">
                <rect x="0" y={(20 - h) / 2} width="28" height={h} rx="1" fill={selected ? "#b45309" : "#c4a77d"} />
              </svg>
              <span className="flex min-w-0 flex-col leading-tight">
                <span className="text-base font-bold">{p.width_mm}mm</span>
                <span className="text-xs text-neutral-600">
                  {format(t.presetSub, { length: p.length_m, thickness: p.thickness_mic })}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
