"use client";
// Starter samples: one click sets colours, text and font.
import { getDictionary } from "@/i18n";
import { DESIGN_TEMPLATES } from "../lib/templates";
import { useDesignState } from "./hooks";
import { focusRing, groupLabel, hint } from "./ui";

export function TemplatePicker() {
  const t = getDictionary().designer;
  const [, dispatch] = useDesignState();
  return (
    <fieldset className="flex min-w-0 flex-col gap-2">
      <legend className={`${groupLabel} mb-0.5`}>{t.templates}</legend>
      <p className={hint}>{t.templatesHint}</p>
      <div className="grid grid-cols-2 gap-2">
        {DESIGN_TEMPLATES.map((tpl) => (
          <button
            key={tpl.id}
            type="button"
            onClick={() => dispatch({ type: "applyTemplate", template: tpl })}
            className={`group flex min-h-11 min-w-0 cursor-pointer flex-col gap-2 rounded-lg border border-slate-200 bg-white p-2 text-left transition-colors duration-150 motion-reduce:transition-none hover:border-slate-400 ${focusRing}`}
          >
            <svg viewBox="0 0 120 22" className="block h-auto w-full" aria-hidden="true">
              <rect width="120" height="22" rx="2" fill={tpl.backgroundColor} stroke="#e2e8f0" />
              <text
                x="60" y="15" textAnchor="middle" fontSize="9" fontWeight="bold" fontFamily={tpl.fontFamily} fill={tpl.textColor}
                textLength={Math.min(110, tpl.text.length * 6)} lengthAdjust="spacingAndGlyphs"
              >
                {tpl.text}
              </text>
            </svg>
            <span className="truncate px-0.5 text-xs font-medium text-slate-700 group-hover:text-slate-900">{tpl.label}</span>
          </button>
        ))}
      </div>
    </fieldset>
  );
}
