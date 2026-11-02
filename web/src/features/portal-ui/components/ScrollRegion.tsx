// Sideways-scrolling wrapper for wide content (tables) on narrow screens. Focusable and named so
// keyboard and screen-reader users can reach and scroll it (WCAG 2.1.1, axe scrollable-region-focusable).
// Universal: usable from server and client components.

type ScrollRegionProps = {
  /** Accessible name of the region (e.g. the table it holds). Required: an unnamed region is noise. */
  label: string;
  /** Extra classes (margins, `relative`). `overflow-x-auto` is always applied. */
  className?: string;
  children: React.ReactNode;
};

export function ScrollRegion({ label, className = "", children }: ScrollRegionProps) {
  return (
    <div role="region" aria-label={label} tabIndex={0} className={`overflow-x-auto ${className}`.trim()}>
      {children}
    </div>
  );
}
