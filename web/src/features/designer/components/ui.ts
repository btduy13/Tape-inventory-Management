// Designer design tokens as Tailwind class strings (one place for radii, borders, focus, states).
// Neutral slate surfaces; Vĩnh Thịnh brand tokens (globals.css --vt-*). One accent rule:
// navy for every selection state (chips, tabs, selected swatches) and secondary buttons,
// red-deep only for the main CTA and the active step; amber is kept for soft warnings.

/** Visible keyboard focus for every interactive control. */
export const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900";

/** Surface card (stage, step panels). */
export const card = "rounded-2xl border border-slate-200 bg-white";

/** Section label inside a step (h3-like). */
export const groupLabel = "text-sm font-semibold text-slate-900";

/** Short helper text under a control. */
export const hint = "text-xs leading-5 text-slate-600";

/** Selected-state ring for swatches / tiles (navy, the one selection accent). */
export const selectedRing = "border-vt-navy ring-2 ring-vt-navy ring-offset-2";

/** Selectable chip / option tile (pair with chipOn or chipOff). */
export const chip = `flex min-h-11 min-w-0 cursor-pointer items-center justify-center rounded-lg border text-sm transition-colors duration-150 motion-reduce:transition-none ${focusRing}`;
export const chipOn = "border-vt-navy bg-vt-navy text-white";
export const chipOff = "border-slate-200 bg-white text-slate-800 hover:border-slate-400";

/** Text input / select. */
export const input = `h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-base text-slate-900 placeholder:text-slate-400 transition-colors duration-150 motion-reduce:transition-none focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/15`;

/** Buttons. */
export const btnPrimary = `inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-lg bg-vt-red-deep px-4 text-sm font-semibold text-white transition-colors duration-150 motion-reduce:transition-none hover:bg-vt-red-dark disabled:cursor-not-allowed disabled:opacity-60 ${focusRing}`;
/** Brand-red primary (--vt-red-deep #cf1f27; white text 5.0:1, AA). */
export const btnBrand = `inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-lg bg-vt-red-deep px-4 text-center text-sm font-semibold text-white transition-colors duration-150 motion-reduce:transition-none hover:bg-vt-red-dark ${focusRing}`;
export const btnSecondary = `inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-vt-navy bg-white px-4 text-sm font-semibold text-vt-navy transition-colors duration-150 motion-reduce:transition-none hover:bg-vt-navy/5 ${focusRing}`;
export const btnGhost = `inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-lg px-3 text-sm font-medium text-slate-700 transition-colors duration-150 motion-reduce:transition-none hover:bg-slate-100 hover:text-slate-900 ${focusRing}`;

/**
 * Mobile/tablet action bar (below lg): 44px buttons + 8px top/bottom padding + 1px border = 61px,
 * plus the safe-area inset. Content clearance = bar + 16px gap; keep these in sync with MobileActionBar.
 */
/** On the designer root: clears the fixed bar below lg (the page adds its own lg padding). */
export const barClearancePb = "pb-[calc(4.875rem+env(safe-area-inset-bottom))] lg:pb-0";
export const barClearanceScrollMb = "scroll-mb-[calc(4.875rem+env(safe-area-inset-bottom))] lg:scroll-mb-4";

/** Scroll an element into view, instantly when the user prefers reduced motion. */
export function scrollToEl(el: Element | null, block: ScrollLogicalPosition = "start") {
  if (!el) return;
  const reduce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block });
}
