// Use-case illustrations: a sealed carton, a paper milk-tea cup with a seal strip over the lid,
// and a stack of e-commerce parcels. Inline SVG, Tailwind classes / SVG attributes only (no inline
// styles: CSP-safe), no external assets. Tape groups carry data-lp-reveal so they "apply" on scroll.
//
// Cartons are drawn in a 3/4 (axonometric) view so the top is visible: the printed tape runs as
// ONE strip along the top flap seam (lengthwise) and folds down over the near end face, like a
// real sealed carton.

type Pt = readonly [number, number];

/** Screen direction of one unit along the box length (x), depth (y) and height (z). */
const EX: Pt = [0.87, -0.42];
const EY: Pt = [-0.77, -0.4];

function projector(origin: Pt, s: number) {
  return (x: number, y: number, z: number): Pt => [
    origin[0] + s * (x * EX[0] + y * EY[0]),
    origin[1] + s * (x * EX[1] + y * EY[1] - z),
  ];
}

const poly = (...p: Pt[]) => p.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");

/** Printed tape pattern: the brand mark + text, repeated along the strip (local units). */
function PrintRow({ x, y, text, count, step, size }: { x: number; y: number; text: string; count: number; step: number; size: number }) {
  return (
    <g className="fill-vt-navy-deep">
      {Array.from({ length: count }, (_, i) => (
        <g key={i}>
          <circle cx={x + i * step} cy={y - size * 0.35} r={size * 0.48} fill="none" strokeWidth={size * 0.16} className="stroke-vt-navy-deep" />
          <circle cx={x + i * step} cy={y - size * 0.35} r={size * 0.17} />
          <text x={x + i * step + size * 0.8} y={y} fontSize={size} fontWeight="800" className="lp-display">
            {text}
          </text>
        </g>
      ))}
    </g>
  );
}

type BoxProps = {
  origin: Pt;
  /** length (x), depth (y), height (z) in box units */
  L: number;
  W: number;
  H: number;
  s?: number;
  tape: { text: string; width: number; fold: number; size: number; count: number; step: number; delay?: string };
  label?: { u: number; w: number; size: number; qr?: boolean };
};

/** One kraft carton, 3/4 view, sealed with a printed strip along the top seam. */
function Box({ origin, L, W, H, s = 1, tape, label }: BoxProps) {
  const p = projector(origin, s);
  const half = W / 2;
  const t0 = half - tape.width / 2;
  const t1 = half + tape.width / 2;
  // text on the top: local u along the length, v toward the front (positive determinant)
  const topText = p(0, half, H);
  const topMatrix = `matrix(${s * EX[0]} ${s * EX[1]} ${-s * EY[0]} ${-s * EY[1]} ${topText[0].toFixed(1)} ${topText[1].toFixed(1)})`;
  // the near end face (x = 0): local u toward the back, w down
  const endMark = p(0, half, H - tape.fold / 2);
  const endMatrix = `matrix(${s * EY[0]} ${s * EY[1]} 0 ${s} ${endMark[0].toFixed(1)} ${endMark[1].toFixed(1)})`;
  // the long side face (y = 0): local u along the length, w down from the top edge
  const side = p(0, 0, H);
  const sideMatrix = `matrix(${s * EX[0]} ${s * EX[1]} 0 ${s} ${side[0].toFixed(1)} ${side[1].toFixed(1)})`;

  return (
    <g>
      {/* near end face (x = 0) and long side face (y = 0) */}
      <polygon points={poly(p(0, 0, 0), p(0, W, 0), p(0, W, H), p(0, 0, H))} className="fill-[#a8743f]" />
      <polygon points={poly(p(0, 0, 0), p(L, 0, 0), p(L, 0, H), p(0, 0, H))} className="fill-lp-kraft" />
      {/* top flaps meeting at the seam */}
      <polygon points={poly(p(0, 0, H), p(L, 0, H), p(L, half, H), p(0, half, H))} className="fill-[#e2b47e]" />
      <polygon points={poly(p(0, half, H), p(L, half, H), p(L, W, H), p(0, W, H))} className="fill-[#d9a86f]" />
      <polyline points={poly(p(0, W, H), p(0, 0, H), p(L, 0, H))} fill="none" strokeWidth="1.5" strokeLinejoin="round" className="stroke-[#f0cc9c]" />
      <line x1={p(0, 0, 0)[0]} y1={p(0, 0, 0)[1]} x2={p(0, 0, H)[0]} y2={p(0, 0, H)[1]} strokeWidth="1.2" className="stroke-[#8e5f30]/60" />

      {label ? (
        <g transform={sideMatrix} data-lp-reveal="fade" className="lp-delay-3">
          <rect x={label.u} y={label.w} width={label.size * 1.5} height={label.size} rx="2" className="fill-white" />
          {label.qr ? (
            <rect x={label.u + label.size * 0.12} y={label.w + label.size * 0.14} width={label.size * 0.6} height={label.size * 0.6} className="fill-vt-blue-ink/80" />
          ) : null}
          <g className="fill-vt-blue-ink/30">
            <rect x={label.u + label.size * (label.qr ? 0.82 : 0.14)} y={label.w + label.size * 0.2} width={label.size * (label.qr ? 0.5 : 1.0)} height={label.size * 0.1} />
            <rect x={label.u + label.size * (label.qr ? 0.82 : 0.14)} y={label.w + label.size * 0.42} width={label.size * (label.qr ? 0.42 : 1.2)} height={label.size * 0.1} />
            <rect x={label.u + label.size * (label.qr ? 0.82 : 0.14)} y={label.w + label.size * 0.64} width={label.size * (label.qr ? 0.3 : 0.7)} height={label.size * 0.1} />
          </g>
        </g>
      ) : null}

      {/* printed tape: along the top seam, folding down over the near end face */}
      <g data-lp-reveal="fade" className={tape.delay ?? ""}>
        <polygon points={poly(p(0, t0, H), p(0, t1, H), p(0, t1, H - tape.fold), p(0, t0, H - tape.fold))} className="fill-[#e9dc0f]" />
        <polygon points={poly(p(0, t0, H), p(L, t0, H), p(L, t1, H), p(0, t1, H))} className="fill-vt-yellow" />
        <line x1={p(0, t0, H)[0]} y1={p(0, t0, H)[1]} x2={p(L, t0, H)[0]} y2={p(L, t0, H)[1]} strokeWidth="1.2" className="stroke-white/70" />
        <g transform={topMatrix}>
          <PrintRow x={tape.size * 1.1} y={tape.size * 0.36} text={tape.text} count={tape.count} step={tape.step} size={tape.size} />
        </g>
        <g transform={endMatrix}>
          <circle r={tape.size * 0.62} fill="none" strokeWidth={tape.size * 0.2} className="stroke-vt-navy-deep" />
          <circle r={tape.size * 0.22} className="fill-vt-navy-deep" />
        </g>
      </g>
    </g>
  );
}

/** Carton sealed with a printed strip. Has an accessible label (used standalone too). */
export function CartonTapeArt({ caption, tapeText }: { caption: string; tapeText: string }) {
  return (
    <figure className="relative h-full w-full">
      <svg viewBox="0 0 372 318" className="h-full w-full" role="img" aria-label={caption}>
        <ellipse cx="186" cy="258" rx="160" ry="40" className="fill-vt-blue-ink/45" />
        <Box
          origin={[140, 292]}
          L={250}
          W={150}
          H={125}
          tape={{ text: tapeText, width: 40, fold: 58, size: 13, count: 2, step: 116 }}
          label={{ u: 150, w: 54, size: 40 }}
        />
      </svg>
      <figcaption className="sr-only">{caption}</figcaption>
    </figure>
  );
}

/** Paper milk-tea cup with a dark lid, sealed by a strip running over the lid. Decorative. */
export function CupSealArt({ tapeText }: { tapeText: string }) {
  return (
    <svg viewBox="0 0 372 318" className="h-full w-full" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="lp-cup-paper" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#dfe2ef" />
          <stop offset="0.28" stopColor="#ffffff" />
          <stop offset="0.7" stopColor="#f6f7fb" />
          <stop offset="1" stopColor="#cfd3e6" />
        </linearGradient>
        <linearGradient id="lp-cup-lid" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#15161c" />
          <stop offset="0.35" stopColor="#3a3c48" />
          <stop offset="1" stopColor="#111217" />
        </linearGradient>
      </defs>
      <ellipse cx="186" cy="300" rx="104" ry="12" className="fill-vt-blue-ink/45" />
      {/* paper cup body, tapered */}
      <path d="M100 86 L272 86 L250 290 Q249 298 240 298 L132 298 Q123 298 122 290 Z" fill="url(#lp-cup-paper)" />
      <path d="M122 290 Q123 298 132 298 L240 298 Q249 298 250 290 L251 282 L121 282 Z" className="fill-[#c9cde0]" />
      {/* a printed band on the paper (generic, not a brand) */}
      <g strokeWidth="3" className="stroke-vt-blue/35">
        <path d="M110 182 L262 182" />
        <path d="M112 194 L260 194" />
      </g>
      {/* dark lid: rim + domed top */}
      <path d="M90 74 Q90 66 98 66 L274 66 Q282 66 282 74 L282 86 Q282 92 274 92 L98 92 Q90 92 90 86 Z" fill="url(#lp-cup-lid)" />
      <path d="M108 66 Q112 34 186 32 Q260 34 264 66 Z" fill="url(#lp-cup-lid)" />
      <ellipse cx="186" cy="38" rx="44" ry="7" className="fill-white/10" />
      <path d="M96 70 L276 70" strokeWidth="1.5" className="stroke-white/20" />
      {/* seal strip: over the dome, across the rim and down the front of the cup */}
      <g data-lp-reveal="scale-y" className="[transform-box:fill-box]">
        <path d="M166 32.6 Q186 31.4 206 32.6 L206 66 L166 66 Z" className="fill-[#e3d40d]" />
        <rect x="166" y="66" width="40" height="26" className="fill-[#efe10f]" />
        <rect x="166" y="92" width="40" height="150" className="fill-vt-yellow" />
        <rect x="166" y="92" width="2.5" height="150" className="fill-white/70" />
        <g transform="rotate(90 186 167)">
          <text x="186" y="172.5" fontSize="15" fontWeight="800" textAnchor="middle" className="lp-display fill-vt-navy-deep">
            {tapeText}
          </text>
        </g>
        <circle cx="186" cy="49" r="7" fill="none" strokeWidth="2.4" className="stroke-vt-navy-deep" />
        <circle cx="186" cy="49" r="2.6" className="fill-vt-navy-deep" />
      </g>
    </svg>
  );
}

/** E-commerce parcels: three taped cartons, each sealed along the top seam. Decorative. */
export function ParcelArt({ tapeText }: { tapeText: string }) {
  const tape = (size: number, step: number, count: number, delay?: string) => ({ text: tapeText, width: 30, fold: 40, size, count, step, delay });
  return (
    <svg viewBox="0 0 372 318" className="h-full w-full" aria-hidden="true" focusable="false">
      <ellipse cx="196" cy="270" rx="172" ry="38" className="fill-vt-blue-ink/45" />
      {/* bottom carton */}
      <Box origin={[128, 290]} L={210} W={140} H={92} tape={tape(11, 98, 2)} label={{ u: 22, w: 30, size: 38, qr: true }} />
      {/* parcel on top */}
      <Box origin={[160, 179]} L={130} W={92} H={70} tape={tape(10, 90, 1, "lp-delay-1")} />
      {/* small parcel in front */}
      <Box origin={[268, 314]} L={70} W={64} H={58} tape={{ text: "", width: 22, fold: 26, size: 8, count: 0, step: 0, delay: "lp-delay-2" }} />
    </svg>
  );
}
