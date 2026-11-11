// Variant E art: a tape roll seen face-on (decorative). Colours are Tailwind fill/stroke classes
// (no inline styles: CSP). The dashed ring makes rotation visible when the roll spins.
export function RollFace({
  face = "fill-vt-yellow",
  mark = "stroke-vt-navy-deep/45",
  hole = "fill-vt-blue-ink",
  className = "",
}: {
  face?: string;
  mark?: string;
  hole?: string;
  className?: string;
}) {
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true" focusable="false" className={className}>
      <circle cx={50} cy={50} r={49} className={face} />
      <circle cx={50} cy={50} r={44} fill="none" strokeWidth={5} strokeDasharray="9 17" className={mark} />
      <circle cx={50} cy={50} r={36} fill="none" strokeWidth={1} className="stroke-vt-navy-deep/15" />
      <circle cx={50} cy={50} r={30} fill="none" strokeWidth={1} className="stroke-vt-navy-deep/15" />
      <circle cx={50} cy={50} r={23} className="fill-lp-kraft" />
      <circle cx={50} cy={50} r={16} className={hole} />
      <rect x={48.5} y={27} width={3} height={6} className="fill-vt-navy-deep/30" />
    </svg>
  );
}

/** Ring + dot print mark used on every printed strip. Sized in em, coloured by the given classes. */
export function PrintMark({ ring, dot }: { ring: string; dot: string }) {
  return (
    <span className={`flex size-[1.1em] shrink-0 items-center justify-center rounded-full border-[0.14em] ${ring}`}>
      <span className={`size-[0.38em] rounded-full ${dot}`} />
    </span>
  );
}
