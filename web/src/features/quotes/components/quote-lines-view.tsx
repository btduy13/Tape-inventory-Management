// Read-only quote table + totals (used by the public page and staff/history views).
import { formatVnd } from "@/i18n";
import { vi } from "@/i18n/vi";
import type { PublicQuote } from "../lib/types";

type Props = Pick<PublicQuote, "lines" | "subtotal" | "vatPercent" | "vatAmount" | "total">;

const qty = (n: number) => new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 2 }).format(n);

export function QuoteLinesView({ lines, subtotal, vatPercent, vatAmount, total }: Props) {
  const t = vi.quotes;
  return (
    // tabIndex: scrolls sideways on narrow screens; keyboard users need focus to scroll it (WCAG 2.1.1).
    <div role="region" aria-label={t.title} tabIndex={0} className="overflow-x-auto">
      <table className="w-full min-w-[560px] text-sm">
        <thead>
          <tr className="border-b border-zinc-300 text-left">
            <th className="py-2 pr-2">{t.description}</th>
            <th className="py-2 pr-2">{t.unit}</th>
            <th className="py-2 pr-2 text-right">{t.quantity}</th>
            <th className="py-2 pr-2 text-right">{t.unitPrice}</th>
            <th className="py-2 text-right">{t.lineTotal}</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((l, i) => (
            <tr key={i} className="border-b border-zinc-200 align-top">
              <td className="py-2 pr-2 whitespace-pre-line">{l.description}</td>
              <td className="py-2 pr-2">{l.unit}</td>
              <td className="py-2 pr-2 text-right">{qty(l.quantity)}</td>
              <td className="py-2 pr-2 text-right">{formatVnd(l.unit_price)}</td>
              <td className="py-2 text-right">{formatVnd(l.line_total)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <dl className="ml-auto mt-3 grid max-w-xs grid-cols-2 gap-y-1 text-sm">
        <dt>{t.subtotal}</dt>
        <dd className="text-right">{formatVnd(subtotal)}</dd>
        <dt>
          {t.vat} ({qty(vatPercent)}%)
        </dt>
        <dd className="text-right">{formatVnd(vatAmount)}</dd>
        <dt className="font-semibold">{t.total}</dt>
        <dd className="text-right font-semibold">{formatVnd(total)}</dd>
      </dl>
    </div>
  );
}
