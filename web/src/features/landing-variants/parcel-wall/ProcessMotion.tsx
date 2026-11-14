// Variant "parcel wall": one small looping motion graphic per process step (design, quote, print,
// deliver). Inline SVG; colours are SVG attributes, motion is CSS keyframes on classes (vp-*, see
// parcel-wall.css): transform and opacity only, no inline styles (CSP). Every scene is drawn in its
// finished state, so with reduced motion (animations off) it is still a complete picture.
// Decorative: the step's own heading and text carry the meaning.

const INK = "#16173a";
const LINE = "#dde1e7";
const SVG = { viewBox: "0 0 240 160", className: "block h-full w-full", "aria-hidden": true, focusable: false } as const;

/** Step 1, design: a name is typed onto a tape strip, then the film colour is tried in three chips. */
function DesignArt() {
  const cells = ["T", "Ê", "N", "", "B", "Ạ", "N"];
  return (
    <svg {...SVG}>
      <rect x={18} y={16} width={204} height={128} rx={14} fill="#ffffff" stroke={LINE} strokeWidth={1.5} />
      {[34, 46, 58].map((cx) => (
        <circle key={cx} cx={cx} cy={31} r={3.5} fill={LINE} />
      ))}
      <line x1={18} y1={45} x2={222} y2={45} stroke={LINE} strokeWidth={1.5} />
      <rect x={32} y={62} width={176} height={40} rx={4} fill="#fef211" />
      <rect className="vp-film vp-film-2" x={32} y={62} width={176} height={40} rx={4} fill="#ffd3df" />
      <rect className="vp-film vp-film-3" x={32} y={62} width={176} height={40} rx={4} fill="#bfe8d2" />
      <circle cx={52} cy={82} r={9} fill={INK} />
      <circle cx={52} cy={82} r={3.6} fill="#cf1f27" />
      <clipPath id="vp-typed">
        <rect className="vp-typing" x={68} y={64} width={98} height={36} />
      </clipPath>
      <g clipPath="url(#vp-typed)">
        {cells.map((c, i) => (
          <text key={i} x={75 + i * 14} y={89} textAnchor="middle" fontSize={19} fontWeight={800} fill={INK}>
            {c}
          </text>
        ))}
      </g>
      <rect className="vp-caret" x={68} y={70} width={2.5} height={24} fill={INK} />
      {["#fef211", "#ffd3df", "#bfe8d2"].map((fill, i) => (
        <circle key={fill} cx={96 + i * 24} cy={124} r={7} fill={fill} stroke="#14161b" strokeOpacity={0.2} />
      ))}
      <circle className="vp-chip" cx={96} cy={124} r={11} fill="none" stroke="#14161b" strokeWidth={2} />
    </svg>
  );
}

/** Step 2, quote: a quote sheet arrives, its lines fill in, and it is confirmed. */
function QuoteArt() {
  return (
    <svg {...SVG}>
      <g className="vp-sheet">
        <rect x={66} y={14} width={108} height={132} rx={10} fill="#ffffff" stroke={LINE} strokeWidth={1.5} />
        <rect x={80} y={30} width={44} height={7} rx={3.5} fill="#14161b" />
        {[54, 72, 90].map((y, i) => (
          <g key={y}>
            <rect x={80} y={y} width={46} height={5} rx={2.5} fill={LINE} />
            <rect className={`vp-row vp-row-${i + 1}`} x={138} y={y} width={22} height={5} rx={2.5} fill="#585f6c" />
          </g>
        ))}
        <line x1={80} y1={106} x2={160} y2={106} stroke={LINE} strokeWidth={1.5} />
        <rect x={80} y={117} width={30} height={7} rx={3.5} fill="#14161b" />
        <rect className="vp-row vp-row-4" x={124} y={115} width={36} height={11} rx={5.5} fill="#cf1f27" />
      </g>
      <g className="vp-pop vp-badge">
        <circle cx={176} cy={128} r={17} fill="#1f7a4d" stroke="#ffffff" strokeWidth={3} />
        <path d="M168 128l6 6 11-12" fill="none" stroke="#ffffff" strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </svg>
  );
}

/** Step 3, production: the tape runs under a turning print cylinder and comes out printed. */
function PrintArt() {
  return (
    <svg {...SVG}>
      {[52, 188].map((cx) => (
        <g key={cx} className="vp-spin vp-spin-fast">
          <circle cx={cx} cy={128} r={11} fill="#ffffff" stroke="#14161b" strokeWidth={2} />
          <line x1={cx} y1={119} x2={cx} y2={137} stroke="#14161b" strokeWidth={2} />
        </g>
      ))}
      <rect x={0} y={88} width={240} height={26} fill="#fef211" />
      <clipPath id="vp-printed">
        <rect x={120} y={86} width={120} height={30} />
      </clipPath>
      <g clipPath="url(#vp-printed)">
        <g className="vp-web">
          {Array.from({ length: 7 }, (_, i) => {
            const x = 56 + i * 40;
            return (
              <g key={i}>
                <circle cx={x} cy={101} r={6} fill={INK} />
                <rect x={x + 10} y={97.5} width={18} height={7} rx={3.5} fill={INK} />
              </g>
            );
          })}
        </g>
      </g>
      <g className="vp-press">
        <g className="vp-spin">
          <circle cx={120} cy={60} r={27} fill={INK} />
          <circle cx={120} cy={41} r={5} fill="#fef211" />
          <circle cx={120} cy={79} r={5} fill="#fef211" />
        </g>
        <circle cx={120} cy={60} r={5} fill="#ffffff" />
      </g>
    </svg>
  );
}

/** Step 4, delivery: the sealed parcel travels along the route and arrives under the pin. */
function DeliverArt() {
  return (
    <svg {...SVG}>
      <line x1={24} y1={130} x2={216} y2={130} stroke="#c3c8d1" strokeWidth={3} strokeLinecap="round" strokeDasharray="1 9" />
      <g className="vp-pin">
        <path d="M186 16c-13 0-23 10-23 23 0 16 23 37 23 37s23-21 23-37c0-13-10-23-23-23z" fill="#cf1f27" />
        <circle cx={186} cy={39} r={8.5} fill="#ffffff" />
      </g>
      <g className="vp-parcel">
        <rect x={158} y={84} width={56} height={42} rx={4} fill="#c69d6c" />
        <rect x={179} y={84} width={14} height={42} fill="#fef211" />
        <circle cx={186} cy={97} r={3.4} fill={INK} />
        <circle cx={186} cy={113} r={3.4} fill={INK} />
        <rect x={197} y={104} width={12} height={9} rx={1.5} fill="#ffffff" />
      </g>
      <g className="vp-pop vp-done">
        <circle cx={209} cy={24} r={12} fill="#1f7a4d" stroke="#ffffff" strokeWidth={3} />
        <path d="M203.5 24l4 4 7.5-8" fill="none" stroke="#ffffff" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </svg>
  );
}

/** One motion graphic per step, in the order of landing.howSteps. */
export const PROCESS_ART = [DesignArt, QuoteArt, PrintArt, DeliverArt];
