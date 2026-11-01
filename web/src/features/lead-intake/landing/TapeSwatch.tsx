// Full-bleed strip of one tape type, height proportional to its width (48 : 60 : 72 mm).
// Decorative (aria-hidden). Tailwind classes only (CSP has no inline styles).
// The strip slides in on scroll (data-lp-reveal) and its print runs slowly (CSS marquee).
export type TapeKind = "clear" | "opaque" | "multi";

const STRIP: Record<TapeKind, { tape: string; text: string; mark: string; dot: string; size: string; type: string }> = {
  clear: {
    tape: "border-y-2 border-white bg-white/45",
    text: "text-lp-cobalt",
    mark: "border-lp-cobalt",
    dot: "bg-lp-cobalt",
    size: "h-16 md:h-24",
    type: "text-lg md:text-2xl",
  },
  opaque: {
    tape: "bg-lp-tape",
    text: "text-lp-ink",
    mark: "border-lp-ink",
    dot: "bg-lp-ink",
    size: "h-20 md:h-30",
    type: "text-xl md:text-3xl",
  },
  multi: {
    tape: "bg-lp-cobalt",
    text: "text-white",
    mark: "border-lp-tape",
    dot: "bg-[#ff4d3d]",
    size: "h-24 md:h-36",
    type: "text-2xl md:text-4xl",
  },
};

export function TapeSwatch({ kind, label, from = "left" }: { kind: TapeKind; label: string; from?: "left" | "right" }) {
  const s = STRIP[kind];
  return (
    <div aria-hidden="true" data-lp-reveal={from} className="overflow-hidden">
      <div
        className={`lp-slide relative flex items-center overflow-hidden shadow-[0_18px_40px_-24px_rgb(10_20_102/0.55)] ${s.size} ${s.tape}`}
      >
        <div className={`flex w-max ${from === "left" ? "lp-marquee lp-marquee-slow" : "lp-marquee-rev lp-marquee-slow"}`}>
          {[0, 1].map((copy) => (
            <div key={copy} className="flex shrink-0 items-center">
              {Array.from({ length: 6 }, (_, i) => (
                <span key={i} className={`lp-display flex items-center gap-3 px-6 whitespace-nowrap md:gap-4 md:px-10 ${s.type} ${s.text}`}>
                  <span className={`flex size-[1.1em] shrink-0 items-center justify-center rounded-full border-[0.14em] ${s.mark}`}>
                    <span className={`size-[0.38em] rounded-full ${s.dot}`} />
                  </span>
                  {label}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
