"use client";
// Starter samples: one click sets colours, text and font.
import { getDictionary } from "@/i18n";
import { DESIGN_TEMPLATES } from "../lib/templates";
import { useDesignState } from "./hooks";

export function TemplatePicker() {
  const t = getDictionary().designer;
  const [, dispatch] = useDesignState();
  return (
    <fieldset className="flex min-w-0 flex-col gap-2">
      <legend className="mb-1 text-sm font-semibold">{t.templates}</legend>
      <div className="grid grid-cols-2 gap-2">
        {DESIGN_TEMPLATES.map((tpl) => (
          <button
            key={tpl.id}
            type="button"
            onClick={() => dispatch({ type: "applyTemplate", template: tpl })}
            className="flex min-h-11 min-w-0 flex-col gap-1 rounded-md border border-neutral-300 p-2 text-left text-xs hover:border-amber-500 focus-visible:outline-2 focus-visible:outline-amber-600"
          >
            <svg viewBox="0 0 120 20" className="h-5 w-full" aria-hidden="true">
              <rect width="120" height="20" fill={tpl.backgroundColor} />
              <text
                x="60" y="14" textAnchor="middle" fontSize="9" fontWeight="bold" fontFamily={tpl.fontFamily} fill={tpl.textColor}
                textLength={Math.min(112, tpl.text.length * 6)} lengthAdjust="spacingAndGlyphs"
              >
                {tpl.text}
              </text>
            </svg>
            <span className="truncate">{tpl.label}</span>
          </button>
        ))}
      </div>
    </fieldset>
  );
}
