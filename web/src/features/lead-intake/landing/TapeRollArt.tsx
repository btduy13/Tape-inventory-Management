// Decorative tape roll (inline SVG, no external assets, no inline styles: CSP-safe).
export function TapeRollArt() {
  return (
    <div aria-hidden className="flex justify-center">
      <svg viewBox="0 0 320 240" className="h-auto w-full max-w-sm" role="presentation">
        <rect x="150" y="98" width="170" height="44" rx="4" className="fill-amber-500" />
        <g className="fill-amber-900/70 text-[13px] font-bold">
          <text x="166" y="126">LOGO</text>
          <text x="226" y="126">LOGO</text>
          <text x="286" y="126">LO</text>
        </g>
        <circle cx="120" cy="120" r="100" className="fill-amber-600" />
        <circle cx="120" cy="120" r="78" className="fill-amber-500" />
        <circle cx="120" cy="120" r="46" className="fill-stone-100" />
        <circle cx="120" cy="120" r="46" className="fill-none stroke-stone-300" strokeWidth="6" />
      </svg>
    </div>
  );
}
