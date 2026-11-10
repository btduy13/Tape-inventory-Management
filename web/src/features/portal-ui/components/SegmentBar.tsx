// One horizontal bar split by share (e.g. orders per workshop step) + a legend of links with counts.
// SVG stretched to full width (preserveAspectRatio none): widths are attributes, not style="" (CSP).
import Link from "next/link";
import { scale } from "./chart-scale";

export type Segment = {
  key: string;
  label: string;
  value: number;
  href: string;
  /** fill-* class of the bar piece and bg-* class of the legend dot (same colour). */
  fill: string;
  dot: string;
};

/** stacked: legend as one column (narrow rail) instead of a row of 4. */
export function SegmentBar({ segments, label, stacked = false }: { segments: readonly Segment[]; label: string; stacked?: boolean }) {
  const total = segments.reduce((s, x) => s + Math.max(0, x.value), 0);
  let acc = 0;
  return (
    <div className="flex flex-col gap-3">
      <svg viewBox="0 0 100 10" preserveAspectRatio="none" role="img" aria-label={label}
        className="h-4 w-full overflow-hidden rounded-full">
        <rect width={100} height={10} className="fill-pt-grey-tint" />
        {total > 0 && segments.map((s) => {
          if (s.value <= 0) return null;
          const x = scale(acc, 0, total, 0, 100);
          acc += s.value;
          return (
            <rect key={s.key} x={x} width={scale(s.value, 0, total, 0, 100)} height={10} className={s.fill}>
              <title>{`${s.label}: ${s.value}`}</title>
            </rect>
          );
        })}
      </svg>
      <ul className={`grid grid-cols-2 gap-x-2 ${stacked ? "xl:grid-cols-1" : "gap-y-2 lg:grid-cols-4"}`}>
        {segments.map((s) => (
          <li key={s.key}>
            <Link href={s.href}
              className="flex min-h-11 items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-pt-text hover:bg-pt-grey-tint">
              <span aria-hidden className={`size-2.5 shrink-0 rounded-full ${s.dot}`} />
              <span className="min-w-0 flex-1 leading-tight">{s.label}</span>
              <span className={`font-semibold ${s.value > 0 ? "text-pt-text" : "text-pt-muted"}`}>{s.value}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
