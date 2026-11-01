// Giant "BĂNG KEO" with a printed tape strip weaving over/under the letters.
// Adapted from lead-intake/landing/HeroWord. Decorative: aria-hidden, the h1 carries the text.
// Weave = layer order: "under" letters, tape, "over" letters. Glyphs forced to fixed widths.
// Motion (CSS only, transform/opacity): letters rise, a mask rect scales in to unroll the tape,
// the roll turns once. No SMIL, static under prefers-reduced-motion.
import s from "./styles";

type Letter = { ch: string; x: number; y: number; w: number; over: boolean };
type Tape = { d: string; roll?: { x: number; y: number; r: number } };
type Layout = { vb: string; fontSize: number; letters: Letter[]; tapes: Tape[]; tapeW: number };

const DELAYS = [s.d1, s.d2, s.d3, s.d4, s.d5, s.d6, s.d7];

const DESKTOP: Layout = {
  vb: "0 135 1665 430",
  fontSize: 330,
  tapeW: 74,
  letters: [
    { ch: "B", x: 60, y: 470, w: 190, over: false },
    { ch: "Ă", x: 264, y: 470, w: 210, over: true },
    { ch: "N", x: 488, y: 470, w: 210, over: false },
    { ch: "G", x: 712, y: 470, w: 215, over: true },
    { ch: "K", x: 997, y: 470, w: 205, over: false },
    { ch: "E", x: 1216, y: 470, w: 170, over: true },
    { ch: "O", x: 1400, y: 470, w: 225, over: false },
  ],
  tapes: [
    {
      d: "M 90 437 C 128 437, 118 340, 155 340 C 262 340, 262 392, 369 392 C 481 392, 481 320, 593 320 C 706 320, 707 380, 820 380 C 960 380, 960 320, 1100 320 C 1200 320, 1200 356, 1301 356 C 1406 356, 1406 300, 1512 300 C 1636 300, 1660 330, 1800 330",
      roll: { x: 90, y: 480, r: 70 },
    },
  ],
};

const MOBILE: Layout = {
  vb: "0 60 900 790",
  fontSize: 330,
  tapeW: 68,
  letters: [
    { ch: "B", x: 16, y: 400, w: 190, over: false },
    { ch: "Ă", x: 220, y: 400, w: 210, over: true },
    { ch: "N", x: 444, y: 400, w: 210, over: false },
    { ch: "G", x: 668, y: 400, w: 215, over: true },
    { ch: "K", x: 136, y: 760, w: 205, over: false },
    { ch: "E", x: 355, y: 760, w: 170, over: true },
    { ch: "O", x: 539, y: 760, w: 225, over: false },
  ],
  tapes: [
    { d: "M -60 300 C 30 300, 40 290, 111 290 C 218 290, 218 324, 325 324 C 437 324, 437 260, 549 260 C 662 260, 662 310, 775 310 C 860 310, 880 270, 980 270" },
    {
      d: "M 70 724 C 150 724, 160 680, 238 680 C 339 680, 339 645, 440 645 C 545 645, 545 610, 651 610 C 780 610, 820 590, 980 590",
      roll: { x: 70, y: 780, r: 62 },
    },
  ],
};

const UNIT = 300;
const REPEATS = 7;

function Letters({ layout, over }: { layout: Layout; over: boolean }) {
  return (
    <g className="fill-white">
      {layout.letters.map((l, i) =>
        l.over === over ? (
          <text
            key={l.ch + i}
            x={l.x}
            y={l.y}
            fontSize={layout.fontSize}
            textLength={l.w}
            lengthAdjust="spacingAndGlyphs"
            className={`lp-display ${s.letter} ${DELAYS[i]}`}
          >
            {l.ch}
          </text>
        ) : null,
      )}
    </g>
  );
}

function Roll({ x, y, r }: { x: number; y: number; r: number }) {
  return (
    <g>
      <circle cx={x} cy={y + 8} r={r} className="fill-lp-navy/35" />
      <g className={s.roll}>
      <circle cx={x} cy={y} r={r} className="fill-lp-tape" />
      <circle cx={x} cy={y} r={r - 10} fill="none" strokeWidth="1.5" className="stroke-lp-navy/20" />
      <circle cx={x} cy={y} r={r - 20} fill="none" strokeWidth="1.5" className="stroke-lp-navy/20" />
      <circle cx={x} cy={y} r={r * 0.46} className="fill-lp-kraft" />
      <circle cx={x} cy={y} r={r * 0.34} className="fill-lp-cobalt" />
      <rect x={x - 3} y={y - r * 0.46} width="6" height={r * 0.12} className="fill-lp-navy/40" />
      </g>
    </g>
  );
}

function WordSvg({ layout, id, text, className }: { layout: Layout; id: string; text: string; className: string }) {
  const unitText = `${text}  ●  `;
  return (
    <svg viewBox={layout.vb} className={className} aria-hidden="true" focusable="false">
      <defs>
        {layout.tapes.map((tape, i) => (
          <path key={i} id={`${id}-p${i}`} d={tape.d} />
        ))}
        {layout.tapes.map((_, i) => (
          <mask key={i} id={`${id}-m${i}`} maskUnits="userSpaceOnUse" x="-200" y="-200" width="2400" height="1400">
            <rect x="-120" y="-200" width="2100" height="1400" fill="white" className={s.wipe} />
          </mask>
        ))}
      </defs>

      <Letters layout={layout} over={false} />

      {layout.tapes.map((_, i) => (
        <g key={i} mask={`url(#${id}-m${i})`}>
          <use href={`#${id}-p${i}`} transform="translate(0 10)" fill="none" strokeWidth={layout.tapeW} className="stroke-lp-navy/35" />
          <use href={`#${id}-p${i}`} fill="none" strokeWidth={layout.tapeW} className="stroke-lp-tape" />
          <use href={`#${id}-p${i}`} transform={`translate(0 ${-layout.tapeW / 2 + 3})`} fill="none" strokeWidth="3" className="stroke-white/50" />
          <text fontSize="27" fontWeight="800" dominantBaseline="central" className="lp-display fill-lp-navy">
            <textPath href={`#${id}-p${i}`} startOffset={120} textLength={UNIT * REPEATS} lengthAdjust="spacingAndGlyphs">
              {unitText.repeat(REPEATS)}
            </textPath>
          </text>
        </g>
      ))}

      <Letters layout={layout} over={true} />

      {layout.tapes.map((tape, i) => (tape.roll ? <Roll key={i} {...tape.roll} /> : null))}
    </svg>
  );
}

export function HeroWordA({ tapeText }: { tapeText: string }) {
  return (
    <>
      <WordSvg layout={DESKTOP} id="mau-a-hw-d" text={tapeText} className="hidden h-auto w-full md:block" />
      <WordSvg layout={MOBILE} id="mau-a-hw-m" text={tapeText} className="block h-auto w-full md:hidden" />
    </>
  );
}
