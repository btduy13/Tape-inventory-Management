// The hero's giant word "BĂNG KEO" with a printed tape strip unrolling from a roll and
// weaving over/under the letters. Pure SVG, decorative (aria-hidden; the h1 carries sr-only text).
// Weaving = layer order: "under" letters, then the tape, then "over" letters.
// Each glyph is forced to a fixed width (textLength) so the layout is font-independent.
// The strips run past the viewBox (overflow visible) so they bleed to the viewport edge;
// the hero section clips them. One line from md up, two lines below md (height capped).
// Motion: CSS (letters rise, tape mask draws, roll spins) + one SMIL animate that pulls the
// print along the strip. LandingMotion pauses SMIL for prefers-reduced-motion.

type Letter = { ch: string; x: number; y: number; w: number; over: boolean };
type Tape = { d: string; rollX?: number; rollY?: number; rollR?: number };
type Layout = { vb: string; fontSize: number; letters: Letter[]; tapes: Tape[]; tapeW: number };

const DESKTOP: Layout = {
  vb: "0 140 1665 470", // cropped to the ink (breve top ~170, roll bottom ~593): no dead band above the word
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
      d: "M 90 437 C 128 437, 118 340, 155 340 C 262 340, 262 392, 369 392 C 481 392, 481 320, 593 320 C 706 320, 707 380, 820 380 C 960 380, 960 320, 1100 320 C 1200 320, 1200 356, 1301 356 C 1406 356, 1406 300, 1512 300 C 1636 300, 1660 330, 1800 330 L 3200 330",
      rollX: 90,
      rollY: 515,
      rollR: 78,
    },
  ],
};

const MOBILE: Layout = {
  vb: "0 70 900 790", // cropped to the ink (breve top ~100, roll bottom ~856)
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
    {
      d: "M -700 300 L -60 300 C 30 300, 40 290, 111 290 C 218 290, 218 324, 325 324 C 437 324, 437 260, 549 260 C 662 260, 662 310, 775 310 C 860 310, 880 270, 980 270 L 1700 270",
    },
    {
      d: "M 70 724 C 150 724, 160 680, 238 680 C 339 680, 339 645, 440 645 C 545 645, 545 610, 651 610 C 780 610, 820 590, 980 590 L 1700 590",
      rollX: 70,
      rollY: 790,
      rollR: 66,
    },
  ],
};

/** One printed repeat on the strip is forced to UNIT user units, so the SMIL loop is seamless. */
const UNIT = 300;
const REPEATS = 12;

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
            className={`lp-display lp-letter lp-ld-${i + 1}`}
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
    <g className="lp-roll">
      <circle cx={x} cy={y} r={r} className="fill-vt-yellow" />
      <circle cx={x} cy={y} r={r - 6} fill="none" strokeWidth="7" strokeDasharray="14 26" className="stroke-vt-navy-deep/55" />
      <circle cx={x} cy={y} r={r - 16} fill="none" strokeWidth="1.5" className="stroke-vt-navy-deep/15" />
      <circle cx={x} cy={y} r={r - 24} fill="none" strokeWidth="1.5" className="stroke-vt-navy-deep/15" />
      <circle cx={x} cy={y} r={r * 0.46} className="fill-lp-kraft" />
      <circle cx={x} cy={y} r={r * 0.33} className="fill-vt-red-dark" />
      <rect x={x - 3} y={y - r * 0.46} width="6" height={r * 0.13} className="fill-vt-navy-deep/30" />
    </g>
  );
}

function WordSvg({ layout, id, text, className }: { layout: Layout; id: string; text: string; className: string }) {
  const unitText = `${text}  ●  `;
  return (
    <svg viewBox={layout.vb} className={className} aria-hidden="true" focusable="false" data-lp-smil overflow="visible">
      <defs>
        {layout.tapes.map((tape, i) => (
          <path key={i} id={`${id}-p${i}`} d={tape.d} />
        ))}
        {layout.tapes.map((tape, i) => (
          <mask key={i} id={`${id}-m${i}`} maskUnits="userSpaceOnUse" x="-1200" y="-200" width="5000" height="1400">
            <path
              d={tape.d}
              pathLength={1}
              fill="none"
              stroke="white"
              strokeWidth={layout.tapeW + 40}
              className="lp-reveal-path"
            />
          </mask>
        ))}
      </defs>

      <Letters layout={layout} over={false} />

      {layout.tapes.map((tape, i) => (
        <g key={i} mask={`url(#${id}-m${i})`}>
          {/* soft contact shadow so the strip reads as lying on the letters */}
          <use href={`#${id}-p${i}`} transform="translate(0 10)" fill="none" strokeWidth={layout.tapeW} className="stroke-vt-red-dark/45" />
          <use href={`#${id}-p${i}`} fill="none" strokeWidth={layout.tapeW} className="stroke-vt-yellow" />
          <use href={`#${id}-p${i}`} transform={`translate(0 ${-layout.tapeW / 2 + 3})`} fill="none" strokeWidth="3" className="stroke-white/45" />
          <text fontSize="27" fontWeight="800" dominantBaseline="central" className="lp-display fill-vt-navy-deep">
            <textPath href={`#${id}-p${i}`} startOffset={-UNIT} textLength={UNIT * REPEATS} lengthAdjust="spacingAndGlyphs">
              {unitText.repeat(REPEATS)}
              <animate attributeName="startOffset" from={-UNIT} to={0} dur="4.5s" repeatCount="indefinite" />
            </textPath>
          </text>
        </g>
      ))}

      <Letters layout={layout} over={true} />

      {layout.tapes.map((tape, i) =>
        tape.rollR ? <Roll key={i} x={tape.rollX!} y={tape.rollY!} r={tape.rollR} /> : null,
      )}
    </svg>
  );
}

export function HeroWord({ tapeText }: { tapeText: string }) {
  return (
    <>
      <WordSvg layout={DESKTOP} id="lp-hw-d" text={tapeText} className="hidden h-auto w-full md:block" />
      <WordSvg layout={MOBILE} id="lp-hw-m" text={tapeText} className="block h-auto max-h-[46svh] w-full md:hidden" />
    </>
  );
}
