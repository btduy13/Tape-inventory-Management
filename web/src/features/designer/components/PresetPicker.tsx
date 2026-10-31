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

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1 text-sm font-semibold">{t.preset}</legend>
      <div role="radiogroup" aria-label={t.preset} className="grid grid-cols-2 gap-2">
        {presets.map((p) => {
          const key = presetKey(p);
          const selected = key === current;
          return (
            <button
              key={key}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => dispatch({ type: "setPreset", preset: p })}
              className={`rounded-md border px-3 py-2 text-left text-sm ${
                selected ? "border-amber-700 bg-amber-50 font-semibold" : "border-neutral-300 hover:border-amber-500"
              }`}
            >
              {format(t.presetDims, { width: p.width_mm, length: p.length_m, thickness: p.thickness_mic })}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
