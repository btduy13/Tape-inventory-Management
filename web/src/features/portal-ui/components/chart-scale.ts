// Pure helpers for the server-rendered SVG charts (BarChart, SegmentBar): nice axis ticks, linear
// scale, compact VND axis labels. No DOM.

/** 1, 2, 2.5, 5 or 10 times a power of ten, >= v (v > 0). */
export function niceStep(v: number): number {
  if (!(v > 0)) return 1;
  const exp = 10 ** Math.floor(Math.log10(v));
  const f = v / exp;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * exp;
}

/** Axis from min(0, lo) to max(0, hi) in about `count` round steps; 0 is always a tick. */
export function niceTicks(lo: number, hi: number, count = 4): { min: number; max: number; ticks: number[] } {
  const a = Math.min(0, lo);
  const b = Math.max(0, hi);
  const step = niceStep((b - a) / count || 1);
  const min = Math.floor(a / step) * step;
  const max = Math.max(Math.ceil(b / step) * step, min + step);
  const ticks: number[] = [];
  for (let t = min; t <= max + step / 2; t += step) ticks.push(Math.round(t * 1e6) / 1e6);
  return { min, max, ticks };
}

/** Linear map of v in [min, max] onto [from, to] (pixels; to < from for a y axis). */
export function scale(v: number, min: number, max: number, from: number, to: number): number {
  return max === min ? from : from + ((v - min) / (max - min)) * (to - from);
}

const one = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 });

/** Axis labels: 1 500 000 000 -> "1,5 tỷ", 45 000 000 -> "45 tr", 800 000 -> "800 k", 0 -> "0". */
export function axisVnd(n: number): string {
  const a = Math.abs(n);
  if (a >= 1e9) return `${one.format(n / 1e9)} tỷ`;
  if (a >= 1e6) return `${one.format(n / 1e6)} tr`;
  if (a >= 1e3) return `${one.format(n / 1e3)} k`;
  return one.format(n);
}
