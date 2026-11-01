// Decorative SVG art for variant B (aria-hidden). Fills/strokes via Tailwind classes only.
import { copyB, TAPE_WIDTHS_MM } from "./copy";
import { s } from "./styles";

const ink = "stroke-(--b-ink)";
const tape = "fill-(--b-accent)";
const tapeDeep = "fill-(--b-accent-deep)";
const kraft = "fill-(--b-kraft)";
const kraftSoft = "fill-(--b-paper-deep)";

/** Static stand-in for the 3D mockup (loading / SSR). Same footprint as TapeMockup3D. */
export function RollFallback() {
  return (
    <div className="flex flex-col gap-3" aria-hidden="true">
      <div className="h-9" />
      <div className="flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-lg border border-neutral-300 bg-stone-100">
        <svg viewBox="0 0 400 300" className="w-3/4">
          <path d="M200 250 L360 268 L360 290 L200 272 Z" className={tape} />
          <ellipse cx="225" cy="150" rx="62" ry="112" className={tapeDeep} />
          <rect x="163" y="38" width="62" height="224" className={tapeDeep} />
          <ellipse cx="163" cy="150" rx="62" ry="112" className={tape} />
          <ellipse cx="163" cy="150" rx="26" ry="47" className={kraft} />
          <ellipse cx="163" cy="150" rx="19" ry="36" className="fill-stone-100" />
        </svg>
        <span className="sr-only">{copyB.mockupFallback}</span>
      </div>
    </div>
  );
}

/** Carton: one strip along the top seam, folding down over the end. */
export function CartonArt({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 400 300" className={className} aria-hidden="true">
      <ellipse cx="200" cy="272" rx="150" ry="12" className="fill-(--b-rule)" />
      {/* faces */}
      <path d="M60 100 L210 175 L210 265 L60 190 Z" className={`${kraft} ${ink}`} strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M210 175 L320 120 L320 210 L210 265 Z" className={`fill-[#b38855] ${ink}`} strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M60 100 L170 45 L320 120 L210 175 Z" className={`fill-[#d4ad79] ${ink}`} strokeWidth="1.5" strokeLinejoin="round" />
      {/* flap seam */}
      <path d="M115 72.5 L265 147.5" className={ink} strokeWidth="1" />
      {/* tape on top + fold down the end face */}
      <path d="M101 79 L251 154 L279 140 L129 65 Z" className={tape} />
      <path d="M251 154 L279 140 L279 186 L251 200 Z" className={tapeDeep} />
      <path d="M118 74 L262 146" className="stroke-(--b-paper)" strokeWidth="3" strokeDasharray="14 10" opacity="0.85" />
      <path d="M265 152 L265 190" className="stroke-(--b-paper)" strokeWidth="3" strokeDasharray="10 8" opacity="0.85" />
    </svg>
  );
}

/** Milk-tea cup: narrow strip from the lid top down the cup side. */
export function CupArt({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 400 300" className={className} aria-hidden="true">
      <ellipse cx="200" cy="276" rx="80" ry="9" className="fill-(--b-rule)" />
      {/* body */}
      <path d="M126 92 L148 268 Q200 278 252 268 L274 92 Z" className={`${kraftSoft} ${ink}`} strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M136 150 L148 268 Q200 278 252 268 L264 150 Q200 162 136 150 Z" className="fill-[#c9a27a]" />
      {/* lid */}
      <path d="M116 92 Q200 108 284 92 L280 80 Q200 94 120 80 Z" className={`fill-(--b-paper) ${ink}`} strokeWidth="1.5" strokeLinejoin="round" />
      <ellipse cx="200" cy="78" rx="80" ry="14" className={`fill-(--b-paper) ${ink}`} strokeWidth="1.5" />
      {/* tape: over the lid top, down the front */}
      <path d="M188 64 L212 64 L212 96 L188 96 Z" className={tapeDeep} />
      <path d="M188 96 L212 96 L212 196 L188 196 Z" className={tape} />
      <path d="M200 70 L200 190" className="stroke-(--b-paper)" strokeWidth="2.5" strokeDasharray="10 8" opacity="0.85" />
    </svg>
  );
}

/** E-commerce parcel: flat mailer box sealed across, with a shipping label. */
export function ParcelArt({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 400 300" className={className} aria-hidden="true">
      <ellipse cx="200" cy="262" rx="160" ry="12" className="fill-(--b-rule)" />
      <path d="M50 150 L190 220 L190 262 L50 192 Z" className={`${kraft} ${ink}`} strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M190 220 L350 140 L350 182 L190 262 Z" className={`fill-[#b38855] ${ink}`} strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M50 150 L210 70 L350 140 L190 220 Z" className={`fill-[#d4ad79] ${ink}`} strokeWidth="1.5" strokeLinejoin="round" />
      {/* label */}
      <path d="M226 118 L282 90 L318 108 L262 136 Z" className={`fill-(--b-paper) ${ink}`} strokeWidth="1" />
      <path d="M244 116 L284 96 M252 120 L292 100 M260 124 L284 112" className={ink} strokeWidth="1" />
      {/* tape across the width, down the front */}
      <path d="M118 177 L132 184 L132 227 L118 220 Z" className={tapeDeep} />
      <path d="M118 177 L132 184 L272 114 L258 107 Z" className={tape} />
      <path d="M126 178 L264 109" className="stroke-(--b-paper)" strokeWidth="2.5" strokeDasharray="10 8" opacity="0.85" />
    </svg>
  );
}

// Mobile stacked geometry (module scope: computed once).
const MOBILE_ROWS = (() => {
  const km = 0.85;
  const gap = 12;
  let y = 6;
  const rows = TAPE_WIDTHS_MM.map((w) => {
    const r = { w, y, h: w * km };
    y += r.h + gap;
    return r;
  });
  return { rows, height: y };
})();

/** True-to-scale width strips. Desktop: side by side. Mobile: stacked. */
export function WidthScale() {
  const max = TAPE_WIDTHS_MM[TAPE_WIDTHS_MM.length - 1];
  // desktop geometry
  const k = 2.2; // px per mm
  const colW = 70;
  const stripW = 40;
  const baseY = 30 + max * k;
  const { rows, height: mobileH } = MOBILE_ROWS;

  return (
    <figure>
      <svg viewBox={`0 0 ${TAPE_WIDTHS_MM.length * colW} ${baseY + 34}`} className="hidden w-full md:block" aria-hidden="true">
        {TAPE_WIDTHS_MM.map((w, i) => {
          const x = i * colW + (colW - stripW) / 2;
          const h = w * k;
          return (
            <g key={w}>
              <rect x={x} y={baseY - h} width={stripW} height={h} className={s.strip} />
              <rect x={x} y={baseY - h} width={stripW * 0.32} height={h} className={s.stripGloss} />
              <text x={i * colW + colW / 2} y={baseY + 26} textAnchor="middle" className={`fill-(--b-ink) text-[13px] ${s.num}`}>
                {w}
              </text>
            </g>
          );
        })}
        <line x1="0" x2={TAPE_WIDTHS_MM.length * colW} y1={baseY + 0.5} y2={baseY + 0.5} className="stroke-(--b-ink)" strokeWidth="1" />
      </svg>
      <svg viewBox={`0 0 320 ${mobileH}`} className="w-full md:hidden" aria-hidden="true">
        {rows.map((r) => (
          <g key={r.w}>
            <text x="34" y={r.y + r.h / 2 + 6} textAnchor="end" className={`fill-(--b-ink) text-[16px] ${s.num}`}>
              {r.w}
            </text>
            <rect x="48" y={r.y} width="272" height={r.h} className={s.strip} />
            <rect x="48" y={r.y} width="272" height={r.h * 0.32} className={s.stripGloss} />
          </g>
        ))}
      </svg>
      <figcaption className="mt-4 text-sm text-(--b-muted)">
        {copyB.widthsLabel}
        <span className="sr-only">. {copyB.widthsSr}</span>
      </figcaption>
    </figure>
  );
}
