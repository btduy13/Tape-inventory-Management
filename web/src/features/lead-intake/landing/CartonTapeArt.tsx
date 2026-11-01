// Use-case illustrations: a sealed carton, a milk-tea cup with a vertical seal strip, and a
// stack of e-commerce parcels. Inline SVG, Tailwind classes only (no inline styles: CSP-safe),
// no external assets. Tape groups carry data-lp-reveal so they "apply" when scrolled into view.
const fillBox = "[transform-box:fill-box]";

function PrintRow({ x, y, text, count, step, size = 15 }: { x: number; y: number; text: string; count: number; step: number; size?: number }) {
  return (
    <g className="fill-lp-ink">
      {Array.from({ length: count }, (_, i) => (
        <g key={i}>
          <circle cx={x + i * step} cy={y - size * 0.35} r={size * 0.5} fill="none" strokeWidth={size * 0.16} className="stroke-lp-ink" />
          <circle cx={x + i * step} cy={y - size * 0.35} r={size * 0.18} />
          <text x={x + i * step + size * 0.85} y={y} fontSize={size} fontWeight="800" className="lp-display">
            {text}
          </text>
        </g>
      ))}
    </g>
  );
}

/** Carton top sealed with a printed strip. Has an accessible label (used standalone too). */
export function CartonTapeArt({ caption, tapeText }: { caption: string; tapeText: string }) {
  return (
    <figure className="relative w-full">
      <svg viewBox="0 0 400 400" className="h-auto w-full" role="img" aria-label={caption}>
        <ellipse cx="200" cy="352" rx="170" ry="16" className="fill-lp-navy/40" />
        <path d="M40 110 L360 110 L360 330 L40 330 Z" className="fill-lp-kraft" />
        <path d="M40 330 L360 330 L350 346 L50 346 Z" className="fill-[#9c6c3c]" />
        <path d="M40 110 L360 110 L360 218 L40 218 Z" className="fill-[#d6a46a]" />
        <line x1="40" y1="220" x2="360" y2="220" strokeWidth="2.5" className="stroke-[#8a5a2d]" />
        <g strokeWidth="1.2" className="stroke-[#b07a43]">
          <line x1="70" y1="140" x2="170" y2="140" />
          <line x1="230" y1="300" x2="330" y2="300" />
        </g>
        <g data-lp-reveal="scale-x" className={fillBox}>
          <rect x="24" y="192" width="352" height="56" className="fill-lp-tape" />
          <rect x="24" y="192" width="352" height="3" className="fill-white/60" />
          <rect x="24" y="245" width="352" height="3" className="fill-[#d9a800]" />
          <path d="M24 192 L14 200 L14 240 L24 248 Z" className="fill-[#d9a800]" />
          <path d="M376 192 L386 200 L386 240 L376 248 Z" className="fill-[#d9a800]" />
          <PrintRow x={46} y={226} text={tapeText} count={2} step={176} />
        </g>
        <g data-lp-reveal="up" className="lp-delay-2">
          <rect x="246" y="264" width="92" height="50" rx="3" className="fill-white" />
          <rect x="256" y="274" width="58" height="5" className="fill-lp-ink/25" />
          <rect x="256" y="285" width="72" height="5" className="fill-lp-ink/25" />
          <rect x="256" y="296" width="40" height="5" className="fill-lp-ink/25" />
        </g>
      </svg>
      <figcaption className="sr-only">{caption}</figcaption>
    </figure>
  );
}

/** Milk-tea cup sealed with a vertical printed strip over the lid. Decorative. */
export function CupSealArt({ tapeText }: { tapeText: string }) {
  return (
    <svg viewBox="0 0 400 400" className="h-auto w-full" aria-hidden="true" focusable="false">
      <ellipse cx="200" cy="368" rx="110" ry="12" className="fill-lp-navy/40" />
      <path d="M118 150 L158 362 L242 362 L282 150 Z" className="fill-white/10" />
      <path d="M110 120 L290 120 L268 352 Q266 364 254 364 L146 364 Q134 364 132 352 Z" className="fill-white/15 stroke-white/60" strokeWidth="2" />
      <path d="M116 168 L284 168 L268 352 Q266 362 254 362 L146 362 Q134 362 132 352 Z" className="fill-[#d9a066]" />
      <path d="M116 168 L284 168 L282 186 L118 186 Z" className="fill-[#e8bd8c]" />
      <g className="fill-[#3a2416]">
        <circle cx="160" cy="342" r="9" />
        <circle cx="182" cy="348" r="9" />
        <circle cx="206" cy="340" r="9" />
        <circle cx="230" cy="347" r="9" />
        <circle cx="246" cy="334" r="9" />
        <circle cx="172" cy="326" r="9" />
        <circle cx="222" cy="326" r="9" />
      </g>
      <ellipse cx="200" cy="120" rx="92" ry="14" className="fill-white/85" />
      <ellipse cx="200" cy="120" rx="92" ry="14" fill="none" strokeWidth="5" className="stroke-white" />
      <g data-lp-reveal="scale-y" className={fillBox}>
        <rect x="176" y="98" width="48" height="16" rx="2" className="fill-[#d9a800]" />
        <rect x="176" y="112" width="48" height="196" className="fill-lp-tape" />
        <rect x="176" y="112" width="3" height="196" className="fill-white/60" />
        <path d="M176 308 L200 300 L224 308 L224 316 L176 316 Z" className="fill-lp-tape" />
        <g transform="rotate(90 200 210)">
          <text x="200" y="216" fontSize="17" fontWeight="800" textAnchor="middle" className="lp-display fill-lp-ink">
            {tapeText}
          </text>
        </g>
      </g>
    </svg>
  );
}

/** Two e-commerce parcels taped and labelled. Decorative. */
export function ParcelArt({ tapeText }: { tapeText: string }) {
  return (
    <svg viewBox="0 0 400 400" className="h-auto w-full" aria-hidden="true" focusable="false">
      <ellipse cx="200" cy="362" rx="170" ry="14" className="fill-lp-navy/40" />
      <rect x="44" y="214" width="312" height="140" className="fill-lp-kraft" />
      <rect x="44" y="214" width="312" height="10" className="fill-[#d6a46a]" />
      <g data-lp-reveal="scale-y" className={fillBox}>
        <rect x="176" y="214" width="48" height="140" className="fill-lp-tape" />
        <g transform="rotate(90 200 284)">
          <text x="200" y="290" fontSize="15" fontWeight="800" textAnchor="middle" className="lp-display fill-lp-ink">
            {tapeText}
          </text>
        </g>
      </g>
      <g data-lp-reveal="up" className="lp-delay-2">
        <rect x="248" y="250" width="86" height="56" rx="3" className="fill-white" />
        <rect x="258" y="262" width="34" height="34" className="fill-lp-ink/80" />
        <rect x="298" y="264" width="28" height="5" className="fill-lp-ink/25" />
        <rect x="298" y="276" width="22" height="5" className="fill-lp-ink/25" />
      </g>
      <g transform="rotate(-6 200 160)">
        <rect x="90" y="96" width="220" height="118" className="fill-[#d6a46a]" />
        <rect x="90" y="96" width="220" height="8" className="fill-[#e3b680]" />
        <g data-lp-reveal="scale-x" className={`lp-delay-1 ${fillBox}`}>
          <rect x="76" y="132" width="248" height="44" className="fill-lp-tape" />
          <rect x="76" y="132" width="248" height="3" className="fill-white/60" />
          <PrintRow x={96} y={160} text={tapeText} count={2} step={124} size={11} />
        </g>
      </g>
    </svg>
  );
}
