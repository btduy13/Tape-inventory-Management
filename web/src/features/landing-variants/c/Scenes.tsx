// Tight SVG scenes for the "Ứng dụng" cards. Each prints the visitor's live brand text and
// colour combo, so the uses read as "your tape here". Decorative: aria-hidden, captions in HTML.
import { useId } from "react";
import { TapePrint } from "./TapePrint";
import { safeId, type Combo } from "./tape";

type SceneProps = { text: string; combo: Combo; mm: number };

type Pt = [number, number];
const pts = (p: Pt[]) => p.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");

/** Oblique carton with one strip along the top seam, folding down the visible end. */
function Box({
  text,
  combo,
  mm,
  x0,
  y0,
  L,
  H,
  dx,
  dy,
  realDepthMm,
  fold,
  children,
}: SceneProps & {
  x0: number;
  y0: number;
  L: number;
  H: number;
  dx: number;
  dy: number;
  realDepthMm: number;
  fold: number;
  children?: React.ReactNode;
}) {
  const id = safeId(useId());
  const half = Math.min(0.42, mm / realDepthMm / 2);
  const t0 = 0.5 - half;
  const t1 = 0.5 + half;
  const top = (u: number, t: number): Pt => [x0 + u + t * dx, y0 + t * dy];
  const side = (t: number, v: number): Pt => [x0 + L + t * dx, y0 + t * dy + v];
  const depthLen = Math.hypot(dx, dy);
  const thick = (t1 - t0) * depthLen;
  // local y axis (across the tape, back -> front) in screen units per local unit
  const ax = (-(t1 - t0) * dx) / thick;
  const ay = (-(t1 - t0) * dy) / thick;
  const [bx, by] = top(0, t1);
  const [sx, sy] = side(t1, 0);

  return (
    <>
      <defs>
        <clipPath id={`${id}t`}>
          <polygon points={pts([top(0, t0), top(L, t0), top(L, t1), top(0, t1)])} />
        </clipPath>
        <clipPath id={`${id}s`}>
          <polygon points={pts([side(t0, 0), side(t1, 0), side(t1, fold), side(t0, fold)])} />
        </clipPath>
      </defs>
      {/* ground shadow */}
      <ellipse cx={x0 + (L + dx) / 2} cy={y0 + H + 6} rx={(L + dx) / 2 + 6} ry={9} fill="#000" opacity={0.35} />
      {/* faces */}
      <polygon points={pts([[x0, y0], [x0 + L, y0], [x0 + L, y0 + H], [x0, y0 + H]])} fill="#c4925a" />
      <polygon points={pts([top(L, 0), top(L, 1), [x0 + L + dx, y0 + dy + H], [x0 + L, y0 + H]])} fill="#a3743f" />
      <polygon points={pts([top(0, 0), top(L, 0), top(L, 1), top(0, 1)])} fill="#d9a96c" />
      {/* flap seam */}
      <line x1={top(0, 0.5)[0]} y1={top(0, 0.5)[1]} x2={top(L, 0.5)[0]} y2={top(L, 0.5)[1]} stroke="#9c6d3a" strokeWidth={1} />
      {children}
      {/* tape on top */}
      <polygon points={pts([top(0, t0), top(L, t0), top(L, t1), top(0, t1)])} fill={combo.bg} />
      <g clipPath={`url(#${id}t)`}>
        <g transform={`matrix(1 0 ${ax.toFixed(3)} ${ay.toFixed(3)} ${bx.toFixed(1)} ${by.toFixed(1)})`}>
          <TapePrint text={text} length={L + 40} thick={thick} fg={combo.fg} accent={combo.accent} offset={20} />
        </g>
      </g>
      {/* tape folding down the end */}
      <polygon points={pts([side(t0, 0), side(t1, 0), side(t1, fold), side(t0, fold)])} fill={combo.bg} />
      <g clipPath={`url(#${id}s)`}>
        <g transform={`matrix(0 1 ${ax.toFixed(3)} ${ay.toFixed(3)} ${sx.toFixed(1)} ${sy.toFixed(1)})`}>
          <TapePrint text={text} length={fold + 20} thick={thick} fg={combo.fg} accent={combo.accent} offset={4} />
        </g>
      </g>
      <polygon points={pts([side(t0, 0), side(t1, 0), side(t1, fold), side(t0, fold)])} fill="#000" opacity={0.18} />
      {/* edge highlight */}
      <polyline points={pts([[x0, y0], [x0 + L, y0], top(L, 1)])} fill="none" stroke="#f0c48a" strokeWidth={1} opacity={0.7} />
    </>
  );
}

export function CartonScene(p: SceneProps) {
  return (
    <svg viewBox="0 0 320 236" className="block h-auto w-full" aria-hidden="true" focusable="false">
      <Box {...p} x0={26} y0={104} L={194} H={104} dx={74} dy={-48} realDepthMm={230} fold={62} />
    </svg>
  );
}

export function ParcelScene(p: SceneProps) {
  return (
    <svg viewBox="0 0 320 236" className="block h-auto w-full" aria-hidden="true" focusable="false">
      <Box {...p} x0={30} y0={130} L={200} H={64} dx={66} dy={-42} realDepthMm={190} fold={40}>
        {/* shipping label on the front face */}
        <rect x={52} y={146} width={84} height={38} rx={2} fill="#f6f6f4" />
        <rect x={58} y={151} width={42} height={4} fill="#17181c" />
        <rect x={58} y={159} width={64} height={3} fill="#8b8f98" />
        <rect x={58} y={165} width={52} height={3} fill="#8b8f98" />
        {[0, 3, 5, 9, 11, 14, 18, 20, 23, 27, 29, 33, 36, 38, 42, 45, 48, 51, 55, 58, 61, 64, 67, 70].map((x) => (
          <rect key={x} x={58 + x} y={171} width={x % 2 ? 1.2 : 2} height={9} fill="#17181c" />
        ))}
      </Box>
    </svg>
  );
}

export function CupScene({ text, combo }: SceneProps) {
  const id = safeId(useId());
  const strip = { x: 150, w: 20, top: 30, bottom: 166 };
  return (
    <svg viewBox="0 0 320 236" className="block h-auto w-full" aria-hidden="true" focusable="false">
      <defs>
        <clipPath id={`${id}c`}>
          <path d="M106 74C106 40 214 40 214 74Z" />
          <rect x={98} y={70} width={124} height={12} rx={4} />
          <path d="M104 82H216L203 226H117Z" />
        </clipPath>
        <clipPath id={`${id}r`}>
          <rect x={strip.x} y={strip.top} width={strip.w} height={strip.bottom - strip.top - 4} />
        </clipPath>
      </defs>
      <ellipse cx={160} cy={229} rx={58} ry={6} fill="#000" opacity={0.35} />
      {/* tea + pearls */}
      <path d="M104 82H216L203 226H117Z" fill="#d6ad80" />
      <path d="M104 82H216L214 104H106Z" fill="#e8cba6" />
      {[
        [126, 214],
        [140, 218],
        [156, 214],
        [172, 218],
        [188, 214],
        [133, 204],
        [149, 206],
        [165, 204],
        [181, 206],
        [195, 202],
      ].map(([cx, cy]) => (
        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={6} fill="#3a2a20" />
      ))}
      <path d="M104 82H216L203 226H117Z" fill="none" stroke="#f3e9dc" strokeOpacity={0.5} strokeWidth={1.5} />
      <path d="M114 92L124 214" stroke="#ffffff" strokeOpacity={0.35} strokeWidth={4} strokeLinecap="round" />
      {/* dome lid + rim */}
      <path d="M106 74C106 40 214 40 214 74Z" fill="#e9eef3" fillOpacity={0.85} />
      <rect x={98} y={70} width={124} height={12} rx={4} fill="#dfe5ec" />
      <path d="M120 66C122 52 140 46 152 45" fill="none" stroke="#ffffff" strokeWidth={3} strokeLinecap="round" opacity={0.8} />
      {/* narrow strip: lid top down the side */}
      <g clipPath={`url(#${id}c)`}>
        <rect x={strip.x} y={strip.top} width={strip.w} height={strip.bottom - strip.top} fill={combo.bg} />
        <g clipPath={`url(#${id}r)`}>
          <g transform={`matrix(0 1 -1 0 ${strip.x + strip.w} ${strip.top})`}>
            <TapePrint text={text} length={strip.bottom - strip.top} thick={strip.w} fg={combo.fg} accent={combo.accent} offset={6} />
          </g>
        </g>
        <rect x={strip.x} y={strip.top} width={3} height={strip.bottom - strip.top} fill="#ffffff" opacity={0.25} />
      </g>
      <path
        d={`M${strip.x} ${strip.bottom}l4 3l4 -3l4 3l4 -3l4 3V${strip.bottom - 3}H${strip.x}Z`}
        fill={combo.bg}
      />
    </svg>
  );
}
