// UI-only ESTIMATE of totals while editing. The DB (quotes_guard / quotes_recalc_totals)
// is the source of truth; saved quotes always display DB values. Mirrors the SQL rounding:
// line_total = round(qty * price, 2); vat = round(subtotal * vat% / 100, 0).

const round = (n: number, digits: number) => {
  const f = 10 ** digits;
  return Math.round((n + Number.EPSILON) * f) / f;
};

export interface Totals {
  subtotal: number;
  vatAmount: number;
  total: number;
}

export function lineTotal(quantity: number, unitPrice: number): number {
  if (!Number.isFinite(quantity) || !Number.isFinite(unitPrice)) return 0;
  return round(quantity * unitPrice, 2);
}

export function estimateTotals(
  lines: ReadonlyArray<{ quantity: number; unitPrice: number }>,
  vatPercent: number,
): Totals {
  const subtotal = round(lines.reduce((s, l) => s + lineTotal(l.quantity, l.unitPrice), 0), 2);
  const vat = Number.isFinite(vatPercent) ? vatPercent : 0;
  const vatAmount = round((subtotal * vat) / 100, 0);
  return { subtotal, vatAmount, total: round(subtotal + vatAmount, 2) };
}
