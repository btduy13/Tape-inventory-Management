"use client";
// Live summary of the chosen spec (size, content, colours). Used beside the quote CTA.
import type { ReactNode } from "react";
import { format, getDictionary } from "@/i18n";
import { MAX_COLORS } from "../lib/constants";
import { lengthIssue } from "../lib/tape-spec";
import { useDesignContext } from "./DesignProvider";
import { useDesignState } from "./hooks";
import { inkCountText, useInks } from "./InkCounter";
import { focusRing } from "./ui";

export type SummaryStep = "spec" | "content" | "colors";

/** Plain-text pieces of the summary (also used for collapsed step headers). */
export function useDesignSummary() {
  const t = getDictionary();
  const { spec } = useDesignContext();
  const [s] = useDesignState();
  const lengthOk = lengthIssue(spec, s.preset.length_m) === null;
  const size = lengthOk
    ? format(t.tapeSpec.sizeValue, { width: s.preset.width_mm, length: s.preset.length_m })
    : `${format(t.tapeSpec.widthOption, { width: s.preset.width_mm })} · ${t.designer.lengthInvalidShort}`;
  const text = s.text.trim();
  const parts = [text ? `“${text}”` : null, s.logo ? t.designer.contentLogo : null].filter(Boolean);
  const content = parts.length ? parts.join(" + ") : t.designer.contentNone;
  // Print inks (tape film colour excluded); over the 3-ink limit is flagged, never blocked.
  const inks = useInks();
  const colors = inks.colors;
  const colorsLabel = inks.overLimit
    ? format(t.designer.inkOverSummary, { count: inkCountText(inks.count) })
    : colors.length === 0
      ? t.designer.colorsNone
      : format(t.designer.colorsCount, { count: colors.length });
  return { size, lengthOk, content, hasContent: parts.length > 0, colors, colorsLabel, inksOver: inks.overLimit, inkCount: inkCountText(inks.count) };
}

export function ColorDots({ colors }: { colors: readonly string[] }) {
  // Nothing to show: render nothing, so a parent's flex gap does not indent the label.
  if (colors.length === 0) return null;
  return (
    <span className="inline-flex shrink-0 -space-x-1" aria-hidden="true">
      {colors.slice(0, MAX_COLORS + 1).map((c) => (
        <svg key={c} width="16" height="16" viewBox="0 0 16 16">
          <circle cx="8" cy="8" r="7" fill={c} stroke="#ffffff" strokeWidth="2" />
          <circle cx="8" cy="8" r="7.5" fill="none" stroke="#cbd5e1" strokeWidth="1" />
        </svg>
      ))}
    </span>
  );
}

export function DesignSummary({ onEdit, className = "" }: { onEdit?: (step: SummaryStep) => void; className?: string }) {
  const t = getDictionary().designer;
  const sum = useDesignSummary();
  const rows: { step: SummaryStep; label: string; value: ReactNode; bad?: boolean }[] = [
    { step: "spec", label: t.summarySize, value: sum.size, bad: !sum.lengthOk },
    { step: "content", label: t.summaryContent, value: sum.content, bad: !sum.hasContent },
    {
      step: "colors",
      label: t.summaryColors,
      value: (
        <span className="inline-flex items-center gap-2">
          <ColorDots colors={sum.colors} />
          {sum.colorsLabel}
        </span>
      ),
      bad: sum.inksOver,
    },
  ];
  return (
    <div className={`rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200 ${className}`}>
      <p className="mb-2 text-xs font-semibold tracking-wide text-slate-600 uppercase">{t.summaryTitle}</p>
      <dl className="flex flex-col divide-y divide-slate-200">
        {rows.map((r) => (
          <div key={r.step} className="flex min-h-11 items-center gap-3 py-1.5">
            <dt className="w-20 shrink-0 text-xs text-slate-600">{r.label}</dt>
            <dd className={`min-w-0 flex-1 truncate text-sm font-medium ${r.bad ? "text-red-700" : "text-slate-900"}`}>{r.value}</dd>
            {onEdit && (
              <button
                type="button"
                onClick={() => onEdit(r.step)}
                aria-label={`${t.edit} ${r.label.toLowerCase()}`}
                className={`-mr-2 inline-flex min-h-11 shrink-0 cursor-pointer items-center rounded-lg px-2 text-xs font-medium text-slate-700 underline underline-offset-2 hover:text-slate-900 ${focusRing}`}
              >
                {t.edit}
              </button>
            )}
          </div>
        ))}
      </dl>
      {sum.inksOver && (
        <p role="note" className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs leading-5 font-medium text-red-800 ring-1 ring-red-200">
          {format(t.inkQuoteNote, { count: sum.inkCount })}
        </p>
      )}
    </div>
  );
}
