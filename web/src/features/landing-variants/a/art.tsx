// Use-case illustrations for variant A. Pure SVG, decorative (aria-hidden).
// Boxes use an oblique projection: front face (x,y,w,h), depth vector (dx,dy).
// The tape runs along the top seam (centre of depth) and folds down the end face.

const KRAFT_TOP = "#dcae74";
const KRAFT_FRONT = "#c8955b";
const KRAFT_SIDE = "#a8773f";
const KRAFT_EDGE = "#7d5426";
const TAPE = "#ffd21f";
const TAPE_SHADE = "#e3b400";
const INK = "#0a1466";

type BoxProps = {
  x: number;
  y: number;
  w: number;
  h: number;
  dx: number;
  dy: number;
  /** how far the tape folds down the end face */
  fold: number;
  text: string;
  /** share of the depth covered by tape (0..1) */
  tape?: number;
  label?: boolean;
};

const pts = (p: [number, number][]) => p.map(([a, b]) => `${a.toFixed(1)},${b.toFixed(1)}`).join(" ");

function Box({ x, y, w, h, dx, dy, fold, text, tape = 0.22, label = false }: BoxProps) {
  const len = Math.hypot(dx, dy);
  const ux = dx / len;
  const uy = dy / len;
  const s0 = 0.5 - tape / 2;
  const s1 = 0.5 + tape / 2;
  const a: [number, number] = [x + dx * s0, y + dy * s0];
  const b: [number, number] = [x + dx * s1, y + dy * s1];
  const tapeDepth = tape * len;
  const right = x + w;
  const cx = x + dx * 0.5;
  const cy = y + dy * 0.5;

  return (
    <g>
      {/* faces */}
      <polygon points={pts([[x, y], [right, y], [right + dx, y + dy], [x + dx, y + dy]])} fill={KRAFT_TOP} stroke={KRAFT_EDGE} strokeWidth="1.5" strokeLinejoin="round" />
      <polygon points={pts([[x, y], [right, y], [right, y + h], [x, y + h]])} fill={KRAFT_FRONT} stroke={KRAFT_EDGE} strokeWidth="1.5" strokeLinejoin="round" />
      <polygon points={pts([[right, y], [right + dx, y + dy], [right + dx, y + dy + h], [right, y + h]])} fill={KRAFT_SIDE} stroke={KRAFT_EDGE} strokeWidth="1.5" strokeLinejoin="round" />
      {/* flap seam, visible beyond the tape edges on the top face */}
      <line x1={x + dx * 0.5} y1={cy} x2={right + dx * 0.5} y2={cy} stroke={KRAFT_EDGE} strokeWidth="1" />

      {/* tape on top, full length */}
      <polygon points={pts([[a[0], a[1]], [a[0] + w, a[1]], [b[0] + w, b[1]], [b[0], b[1]]])} fill={TAPE} />
      <line x1={a[0]} y1={a[1]} x2={a[0] + w} y2={a[1]} stroke="#fff" strokeOpacity="0.6" strokeWidth="1.2" />
      <line x1={b[0]} y1={b[1]} x2={b[0] + w} y2={b[1]} stroke={TAPE_SHADE} strokeWidth="1.2" />
      <g transform={`matrix(1 0 ${-ux} ${-uy} ${cx} ${cy})`}>
        <text x={10} y={0} fontSize={tapeDepth * 0.55} fontWeight="900" fill={INK} dominantBaseline="central" textLength={w - 20} lengthAdjust="spacingAndGlyphs" className="lp-display">
          {`${text}  ●  ${text}`}
        </text>
      </g>

      {/* tape folding down the end face */}
      <polygon points={pts([[a[0] + w, a[1]], [b[0] + w, b[1]], [b[0] + w, b[1] + fold], [a[0] + w, a[1] + fold]])} fill={TAPE_SHADE} />
      <line x1={a[0] + w} y1={a[1]} x2={b[0] + w} y2={b[1]} stroke="#fff" strokeOpacity="0.7" strokeWidth="1.2" />
      <g transform={`matrix(${ux} ${uy} 0 1 ${a[0] + w} ${a[1]})`}>
        <circle cx={tapeDepth / 2} cy={fold * 0.32} r={tapeDepth * 0.22} fill={INK} />
        <circle cx={tapeDepth / 2} cy={fold * 0.72} r={tapeDepth * 0.22} fill={INK} />
      </g>

      {label && (
        <g>
          <rect x={x + w * 0.1} y={y + h * 0.3} width={w * 0.42} height={h * 0.5} rx="3" fill="#fff" stroke={KRAFT_EDGE} strokeWidth="1" />
          <rect x={x + w * 0.14} y={y + h * 0.37} width={w * 0.2} height={h * 0.06} rx="1" fill={INK} />
          <rect x={x + w * 0.14} y={y + h * 0.47} width={w * 0.32} height={h * 0.035} rx="1" fill="#9aa3c7" />
          <rect x={x + w * 0.14} y={y + h * 0.53} width={w * 0.26} height={h * 0.035} rx="1" fill="#9aa3c7" />
          <g fill={INK}>
            {[0, 3, 5, 9, 11, 14, 17, 19, 22, 25, 27, 30].map((o, i) => (
              <rect key={o} x={x + w * 0.14 + o * (w * 0.011)} y={y + h * 0.62} width={i % 3 === 0 ? w * 0.016 : w * 0.008} height={h * 0.12} />
            ))}
          </g>
        </g>
      )}
    </g>
  );
}

export function CartonArt({ text }: { text: string }) {
  return (
    <svg viewBox="0 30 440 300" className="h-full w-full" aria-hidden="true" focusable="false">
      <ellipse cx="230" cy="296" rx="200" ry="14" fill={INK} fillOpacity="0.12" />
      <Box x={40} y={140} w={270} h={150} dx={90} dy={-58} fold={74} text={text} tape={0.28} />
    </svg>
  );
}

export function EcomArt({ text }: { text: string }) {
  return (
    <svg viewBox="0 30 440 300" className="h-full w-full" aria-hidden="true" focusable="false">
      <ellipse cx="225" cy="298" rx="200" ry="13" fill={INK} fillOpacity="0.12" />
      <Box x={230} y={118} w={130} h={90} dx={56} dy={-36} fold={44} text={text} tape={0.3} />
      <Box x={196} y={208} w={150} h={82} dx={60} dy={-38} fold={40} text={text} tape={0.3} />
      <Box x={36} y={168} w={170} h={122} dx={64} dy={-42} fold={52} text={text} tape={0.28} label />
    </svg>
  );
}

/** Milk-tea cup with dome lid. A narrow strip starts on the flat top of the lid,
 *  runs down the dome front, over the rim lip and down the cup wall. */
export function CupArt({ text }: { text: string }) {
  const cx = 168;
  const half = 12; // strip half width
  const sl = cx - half;
  const sr = cx + half;
  return (
    <svg viewBox="0 0 400 300" className="h-full w-full" aria-hidden="true" focusable="false">
      <ellipse cx="200" cy="284" rx="160" ry="10" fill={INK} fillOpacity="0.12" />

      {/* cup body (clear plastic) with milk tea */}
      <path d="M 98 92 L 120 270 A 48 8 0 0 0 216 270 L 238 92 Z" fill="#eef1fa" stroke="#9aa3c7" strokeWidth="1.5" />
      <path d="M 102 126 Q 168 136 234 126 L 216 270 A 48 8 0 0 1 120 270 Z" fill="#c9a074" />
      <path d="M 102 126 Q 168 136 234 126 Q 168 118 102 126 Z" fill="#dcbb93" />
      <g fill="#3b2416">
        {[
          [132, 258], [148, 263], [164, 265], [180, 264], [196, 261], [208, 255],
          [140, 247], [156, 252], [172, 254], [188, 251], [202, 245], [126, 245],
        ].map(([x, y]) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r="7" />
        ))}
      </g>
      <path d="M 112 104 L 128 252" stroke="#fff" strokeOpacity="0.7" strokeWidth="5" strokeLinecap="round" />

      {/* lid: rim lip + dome */}
      <ellipse cx="168" cy="94" rx="76" ry="13" fill="#f7f8fc" stroke="#9aa3c7" strokeWidth="1.5" />
      <path d="M 100 92 C 104 62, 128 46, 134 42 L 202 42 C 208 46, 232 62, 236 92 Z" fill="#f7f8fc" fillOpacity="0.92" stroke="#9aa3c7" strokeWidth="1.5" />
      <ellipse cx="168" cy="42" rx="34" ry="7" fill="#fff" stroke="#9aa3c7" strokeWidth="1.5" />
      <path d="M 114 82 C 118 66, 128 56, 136 50" stroke="#fff" strokeWidth="4" fill="none" strokeLinecap="round" />

      {/* strip shadow on the cup wall where it leaves the rim lip */}
      <rect x={sl} y="107" width={half * 2} height="8" fill={INK} fillOpacity="0.15" />
      {/* strip: flat top (lighter), dome front, lip band (wider), cup wall */}
      <path d={`M ${sl} 37 L ${sr} 37 L ${sr} 49 L ${sl} 49 Z`} fill="#ffe36b" />
      <path d={`M ${sl} 49 L ${sr} 49 L ${sr} 97 L ${sl} 97 Z`} fill={TAPE} />
      <path d={`M ${sl - 1.5} 97 L ${sr + 1.5} 97 L ${sr + 1.5} 108 L ${sl - 1.5} 108 Z`} fill={TAPE_SHADE} />
      <path d={`M ${sl} 108 L ${sr} 108 L ${sr} 182 L ${sl} 180 Z`} fill={TAPE} />
      <line x1={sl} y1="37" x2={sl} y2="180" stroke="#fff" strokeOpacity="0.6" strokeWidth="1.2" />
      <circle cx={cx} cy="72" r="5" fill={INK} />
      <text x={0} y={0} transform={`translate(${cx} 118) rotate(90)`} fontSize="13" fontWeight="900" fill={INK} dominantBaseline="central" textLength="56" lengthAdjust="spacingAndGlyphs" className="lp-display">
        {text}
      </text>

      {/* narrow roll the strip comes from */}
      <g>
        <circle cx="318" cy="236" r="44" fill={TAPE_SHADE} />
        <circle cx="326" cy="236" r="44" fill={TAPE} />
        <circle cx="326" cy="236" r="34" fill="none" stroke={INK} strokeOpacity="0.15" strokeWidth="1.5" />
        <circle cx="326" cy="236" r="22" fill="#c8955b" />
        <circle cx="326" cy="236" r="16" fill="#eef1fa" />
      </g>
    </svg>
  );
}
