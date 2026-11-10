// Stacked bar chart + optional line, server-rendered SVG. Geometry goes in SVG attributes and colour
// in Tailwind fill-* / stroke-* classes: no style="" (nonce CSP), no JS. Each column has a <title>
// tooltip; callers add a data table for screen readers (the svg itself only has a summary label).
import { axisVnd, niceTicks, scale } from "./chart-scale";

export type BarSeries = { key: string; label: string; className: string };
export type BarRow = {
  label: string;
  /** Native tooltip of the column (month and exact amounts). */
  title: string;
  values: Readonly<Record<string, number>>;
  /** Line value at this column; null = no point. */
  line?: number | null;
};

type Props = {
  series: readonly BarSeries[];
  rows: readonly BarRow[];
  /** Accessible name of the svg (role="img"). */
  label: string;
  width?: number;
  height?: number;
  className?: string;
};

const PAD = { top: 12, right: 8, bottom: 26, left: 52 };

export function BarChart({ series, rows, label, width = 960, height = 280, className = "" }: Props) {
  const totals = rows.map((r) => series.reduce((s, x) => s + Math.max(0, r.values[x.key] ?? 0), 0));
  const lines = rows.map((r) => r.line).filter((v): v is number => typeof v === "number");
  const { min, max, ticks } = niceTicks(Math.min(0, ...lines), Math.max(0, ...totals, ...lines));
  const bottom = height - PAD.bottom;
  const y = (v: number) => scale(v, min, max, bottom, PAD.top);
  const band = (width - PAD.left - PAD.right) / Math.max(rows.length, 1);
  const barW = Math.min(band * 0.62, 56);
  const cx = (i: number) => PAD.left + band * i + band / 2;
  const points = rows.flatMap((r, i) => (typeof r.line === "number" ? [[cx(i), y(r.line)] as const] : []));

  return (
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={label} className={`h-auto w-full ${className}`}>
      {ticks.map((t) => (
        <g key={t}>
          <line x1={PAD.left} x2={width - PAD.right} y1={y(t)} y2={y(t)}
            className={t === 0 ? "stroke-pt-line-strong" : "stroke-pt-line"} strokeDasharray={t === 0 ? undefined : "3 4"} />
          <text x={PAD.left - 8} y={y(t)} dy="0.32em" textAnchor="end" className="fill-pt-muted text-[11px]">{axisVnd(t)}</text>
        </g>
      ))}
      {rows.map((r, i) => {
        let acc = 0;
        return (
          <g key={r.label + i}>
            <title>{r.title}</title>
            {/* full-height hit area so the tooltip shows anywhere over the column */}
            <rect x={cx(i) - band / 2} y={PAD.top} width={band} height={bottom - PAD.top} className="fill-transparent" />
            {series.map((s) => {
              const v = Math.max(0, r.values[s.key] ?? 0);
              if (v === 0) return null;
              const top = y(acc + v);
              const h = y(acc) - top;
              acc += v;
              return <rect key={s.key} x={cx(i) - barW / 2} y={top} width={barW} height={Math.max(h, 0.5)} className={s.className} />;
            })}
            <text x={cx(i)} y={height - 8} textAnchor="middle" className="fill-pt-muted text-[11px]">{r.label}</text>
          </g>
        );
      })}
      {points.length > 1 && (
        <path d={points.map(([px, py], i) => `${i ? "L" : "M"}${px.toFixed(1)} ${py.toFixed(1)}`).join(" ")}
          className="fill-none stroke-pt-text" strokeWidth={2} strokeLinejoin="round" />
      )}
      {points.map(([px, py], i) => (
        <circle key={i} cx={px} cy={py} r={3.5} className="fill-pt-surface stroke-pt-text" strokeWidth={2} />
      ))}
    </svg>
  );
}
