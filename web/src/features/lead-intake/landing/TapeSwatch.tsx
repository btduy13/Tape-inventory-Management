// Small CSS-only sample of a tape type laid on kraft carton. Decorative (aria-hidden).
// Tailwind classes only (CSP has no inline styles).
export type TapeKind = "clear" | "opaque" | "multi";

const STRIP: Record<TapeKind, { tape: string; text: string; mark: string }> = {
  clear: { tape: "border-y border-white/60 bg-white/25", text: "text-stone-900", mark: "bg-stone-900" },
  opaque: { tape: "bg-stone-100", text: "text-amber-900", mark: "bg-amber-900" },
  multi: { tape: "bg-amber-400", text: "text-stone-900", mark: "bg-red-700" },
};

export function TapeSwatch({ kind, label }: { kind: TapeKind; label: string }) {
  const s = STRIP[kind];
  return (
    <div aria-hidden className="relative flex h-28 items-center overflow-hidden rounded-md bg-[#c99c66]">
      <div className="absolute inset-x-0 top-1/2 h-px bg-[#8a6239]" />
      <div className={`relative flex h-12 w-max min-w-[130%] shrink-0 -translate-x-4 items-center gap-6 whitespace-nowrap ${s.tape}`}>
        {[0, 1, 2].map((i) => (
          <span key={i} className={`flex items-center gap-2 text-xs font-extrabold tracking-wide ${s.text}`}>
            <span className={`h-4 w-4 shrink-0 rounded-full ${s.mark}`} />
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
