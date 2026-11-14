"use client";
// Live print ink count ("Số màu in: 2/3") with swatches. Rules: lib/logo-colors.ts printInks().
import { useMemo } from "react";
import { format, getDictionary } from "@/i18n";
import { INK_DISPLAY_CAP, MAX_COLORS } from "../lib/constants";
import { printInks, type InkSummary } from "../lib/logo-colors";
import { useDesignState } from "./hooks";
import { hint } from "./ui";

/** Customer-facing colour count: the number up to INK_DISPLAY_CAP, then "hơn 6". */
export function inkCountText(count: number): string {
  return count > INK_DISPLAY_CAP ? format(getDictionary().designer.inkMany, { cap: INK_DISPLAY_CAP }) : String(count);
}

/** Ink summary of the current design (memoised on the fields it reads). */
export function useInks(): InkSummary {
  const [s] = useDesignState();
  const { backgroundColor, textColor, text, logo, pattern, border, logoMono } = s;
  return useMemo(
    () => printInks({ backgroundColor, textColor, text, logo, pattern, border, logoMono }),
    [backgroundColor, textColor, text, logo, pattern, border, logoMono],
  );
}

export function InkCounter({ className = "" }: { className?: string }) {
  const t = getDictionary().designer;
  const inks = useInks();
  // Swatches stop at the display cap; a photo logo would otherwise draw 20+ dots.
  const slots = Math.min(Math.max(MAX_COLORS, inks.count), INK_DISPLAY_CAP);
  const many = inks.count > INK_DISPLAY_CAP;
  const status = inks.logoPending ? t.inkAnalyzing : inks.logoUnknown ? t.inkUnknown : null;
  return (
    <div
      data-testid="ink-counter"
      className={`flex flex-col gap-1 rounded-lg px-3 py-2 ${inks.overLimit ? "bg-red-50 ring-1 ring-red-200" : "bg-slate-50"} ${className}`}
    >
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-semibold text-slate-900 tabular-nums" aria-live="polite">
        <span className="flex gap-0.5">
          {Array.from({ length: slots }, (_, i) => {
            const c = inks.colors[i];
            return (
              <svg key={i} width="12" height="12" viewBox="0 0 12 12" role={c ? "img" : undefined} aria-label={c ? format(t.inkSwatch, { n: i + 1, hex: c }) : undefined} aria-hidden={c ? undefined : true}>
                <circle cx="6" cy="6" r="5.25" fill={c ?? "#ffffff"} stroke={i >= MAX_COLORS ? "#b91c1c" : "#94a3b8"} strokeDasharray={c ? undefined : "2 1.5"} />
              </svg>
            );
          })}
        </span>
        <span className={inks.overLimit ? "text-red-700" : undefined}>{many ? format(t.inkCountMany, { cap: INK_DISPLAY_CAP, max: MAX_COLORS }) : format(t.inkCount, { count: inks.count, max: MAX_COLORS })}</span>
        {inks.overLimit && <span className="font-medium text-red-700">· {t.inkOver}</span>}
        {inks.logoCount > MAX_COLORS && <span className="font-medium text-red-700">({format(t.inkLogoCount, { count: inkCountText(inks.logoCount) })})</span>}
      </p>
      {status && <p className={hint}>{status}</p>}
    </div>
  );
}
