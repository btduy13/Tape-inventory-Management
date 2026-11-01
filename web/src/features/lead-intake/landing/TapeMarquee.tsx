// Full-bleed printed tape strip that scrolls endlessly (CSS transform only). Decorative.
// The run of items is rendered twice; the track slides by exactly -50% for a seamless loop.
export type MarqueeTone = "tape" | "white" | "cobalt";

const TONES: Record<MarqueeTone, { strip: string; text: string; mark: string }> = {
  tape: { strip: "bg-lp-tape", text: "text-lp-ink", mark: "bg-lp-cobalt" },
  white: { strip: "bg-white", text: "text-lp-cobalt", mark: "bg-lp-tape ring-2 ring-lp-cobalt" },
  cobalt: { strip: "bg-lp-cobalt", text: "text-white", mark: "bg-lp-tape" },
};

export function TapeMarquee({
  items,
  tone = "tape",
  reverse = false,
  className = "",
}: {
  items: readonly string[];
  tone?: MarqueeTone;
  reverse?: boolean;
  className?: string;
}) {
  const s = TONES[tone];
  const run = [...items, ...items, ...items];
  return (
    <div aria-hidden="true" className={`relative z-10 overflow-hidden shadow-[0_10px_30px_-12px_rgb(10_20_102/0.45)] ${s.strip} ${className}`}>
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/50" />
      <div className={`flex w-max ${reverse ? "lp-marquee-rev" : "lp-marquee"}`}>
        {[0, 1].map((copy) => (
          <div key={copy} className="flex shrink-0 items-center">
            {run.map((item, i) => (
              <span
                key={`${copy}-${i}`}
                className={`lp-display flex items-center gap-4 px-5 py-3 text-base whitespace-nowrap sm:text-lg ${s.text}`}
              >
                <span className={`inline-block size-3.5 shrink-0 rounded-full ${s.mark}`} />
                {item}
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
