// Hero illustration: top of a kraft carton sealed with a logo-printed tape strip.
// Inline SVG, Tailwind classes only (no inline styles: CSP-safe), no external assets.
const REPEATS = [0, 1];

export function CartonTapeArt({ caption, tapeText }: { caption: string; tapeText: string }) {
  return (
    <figure className="relative mx-auto w-full max-w-md md:max-w-none">
      <svg viewBox="0 0 400 320" className="h-auto w-full" role="img" aria-label={caption}>
        {/* carton body seen from above, slight perspective via side face */}
        <path d="M30 70 L370 70 L370 290 L30 290 Z" className="fill-[#c99c66]" />
        <path d="M30 290 L370 290 L360 306 L40 306 Z" className="fill-[#9c7344]" />
        {/* two top flaps meeting at the centre seam */}
        <path d="M30 70 L370 70 L370 178 L30 178 Z" className="fill-[#d2a873]" />
        <path d="M30 182 L370 182 L370 290 L30 290 Z" className="fill-[#c99c66]" />
        <line x1="30" y1="180" x2="370" y2="180" className="stroke-[#8a6239]" strokeWidth="2" />
        {/* corrugation hints */}
        <g className="stroke-[#b98b55]" strokeWidth="1">
          <line x1="60" y1="96" x2="150" y2="96" />
          <line x1="250" y1="262" x2="340" y2="262" />
        </g>
        {/* the tape: runs across the seam and folds over both sides */}
        <rect x="14" y="152" width="372" height="56" className="fill-amber-400" />
        <rect x="14" y="152" width="372" height="4" className="fill-amber-300" />
        <rect x="14" y="204" width="372" height="4" className="fill-amber-500" />
        <path d="M14 152 L4 160 L4 200 L14 208 Z" className="fill-amber-600" />
        <path d="M386 152 L396 160 L396 200 L386 208 Z" className="fill-amber-600" />
        <g className="fill-stone-900 font-extrabold">
          {REPEATS.map((i) => (
            <g key={i}>
              <circle cx={40 + i * 182} cy="180" r="9" className="fill-stone-900" />
              <circle cx={40 + i * 182} cy="180" r="4" className="fill-amber-400" />
              <text x={54 + i * 182} y="184.5" fontSize="12" textLength="148" lengthAdjust="spacingAndGlyphs">
                {tapeText}
              </text>
            </g>
          ))}
        </g>
        {/* shipping label, so the tape reads as "on a real parcel" */}
        <rect x="250" y="226" width="96" height="50" rx="3" className="fill-stone-50" />
        <g className="fill-stone-300">
          <rect x="260" y="236" width="60" height="5" />
          <rect x="260" y="247" width="76" height="5" />
          <rect x="260" y="258" width="44" height="5" />
        </g>
      </svg>
      <figcaption className="sr-only">{caption}</figcaption>
    </figure>
  );
}
