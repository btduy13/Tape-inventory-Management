// Shared landing layout + button classes (Tailwind only; CSP forbids inline styles).
// One container for every section so headings, copy and the header logo share the same left edge.
export const LP_CONTAINER = "mx-auto w-full max-w-[1440px] px-4 sm:px-8 lg:px-12";

/** Vertical rhythm for full sections. */
export const LP_SECTION_Y = "py-20 md:py-28";

/** Big section heading (h2). */
export const LP_H2 = "lp-display text-[2.75rem] leading-[0.95] text-balance sm:text-6xl lg:text-7xl";

export const RING_ON_DARK = "focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white";
export const RING_ON_LIGHT = "focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-vt-navy";

/** Pill CTA base: press feedback + hover lift live in globals.css (.lp-press). */
export const BTN = "lp-press lp-display inline-flex items-center justify-center rounded-full px-7 py-4 text-lg";
