// Detail table of one quote: a semibold row per size, its new axes one level below ("└"), then
// Tạm tính / VAT / Tổng cộng (and the deposit when there is one). Same sums as the printed sheet
// (quoteBundle).
import { format, getDictionary } from "@/i18n";
import { surfaceClass } from "@/features/portal-ui/components/styles";
import { money, plain } from "@/features/admin-orders/lib/format";
import { number, vatPercentFromAmount } from "@/features/admin-orders/lib/order-math";
import { quoteBundle } from "../lib/bundle";
import type { QuoteItem } from "../lib/bundle";

const c = getDictionary().baoGia;
const td = "px-3 py-2.5 align-top";
const num = `${td} text-right tabular-nums whitespace-nowrap`;
const circ = (v: number | null) => (v ? format(c.circumference, { v: plain(v) }) : "—");

/** Phones show only Hạng mục + Thành tiền: quy cách and SL x đơn giá go under the name. */
function Phone({ spec, qty, price }: { spec: string; qty: number; price: number }) {
  return <span className="block text-xs font-normal text-pt-muted sm:hidden">{spec} · {plain(qty)} × {money(price)}</span>;
}

export function QuoteLines({ items, productName, deposit }: { items: readonly QuoteItem[]; productName: string; deposit: unknown }) {
  const b = quoteBundle([...items]);
  const subtotal = b.productSubtotal + b.axisSubtotal;
  const vat = b.vat + b.axisVat;
  const total = subtotal + vat;
  const dep = Math.max(0, Math.round(number(deposit as number)));

  return (
    <section aria-labelledby="quote-lines" className={`${surfaceClass} overflow-hidden`}>
      <h2 id="quote-lines" className="border-b border-pt-line px-4 py-3 text-base font-semibold text-pt-text">{c.lines}</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-pt-line text-xs text-pt-muted">
            <tr>
              <th scope="col" className="px-3 py-3 font-semibold">{c.colItem}</th>
              <th scope="col" className="hidden px-3 py-3 font-semibold sm:table-cell">{c.colSpec}</th>
              <th scope="col" className="hidden px-3 py-3 text-right font-semibold sm:table-cell">{c.colQty}</th>
              <th scope="col" className="hidden px-3 py-3 text-right font-semibold sm:table-cell">{c.colUnitPrice}</th>
              <th scope="col" className="px-3 py-3 text-right font-semibold">{c.colAmount}</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => {
              const color = [item.details?.glueColor, item.details?.printColor ?? item.details?.color].filter(Boolean).join(" · ");
              return [
                <tr key={`s${i}`} className="border-t border-pt-line font-semibold text-pt-text first:border-t-0">
                  <td className={td}>
                    {items.length > 1 ? format(c.size, { n: i + 1 }) : productName}
                    {color && <span className="block text-xs font-normal text-pt-muted">{color}</span>}
                    <Phone spec={item.specification} qty={item.quantity} price={item.unitPrice} />
                  </td>
                  <td className={`${td} hidden sm:table-cell`}>{item.specification}</td>
                  <td className={`${num} hidden sm:table-cell`}>{plain(item.quantity)}</td>
                  <td className={`${num} hidden sm:table-cell`}>{money(item.unitPrice)}</td>
                  <td className={num}>{money(item.total)}</td>
                </tr>,
                ...item.axes.map((a, j) => (
                  <tr key={`s${i}a${j}`} className="border-t border-pt-line text-pt-text">
                    <td className={`${td} pl-6`}>
                      <span aria-hidden className="mr-1.5 text-pt-muted">└</span>
                      {a.name || c.newAxis}
                      <span className="sr-only"> ({format(c.axis, { n: j + 1 })})</span>
                      <Phone spec={circ(a.circumference)} qty={a.quantity} price={a.unitPrice} />
                    </td>
                    <td className={`${td} hidden text-pt-muted sm:table-cell`}>{circ(a.circumference)}</td>
                    <td className={`${num} hidden sm:table-cell`}>{plain(a.quantity)}</td>
                    <td className={`${num} hidden sm:table-cell`}>{money(a.unitPrice)}</td>
                    <td className={num}>{money(a.total)}</td>
                  </tr>
                )),
              ];
            })}
          </tbody>
        </table>
      </div>
      <dl className="ml-auto grid w-full max-w-sm grid-cols-[1fr_auto] gap-x-6 gap-y-1.5 border-t border-pt-line px-4 py-3 text-sm">
        <dt className="text-pt-muted">{c.subtotal}</dt><dd className="text-right tabular-nums">{money(subtotal)}</dd>
        <dt className="text-pt-muted">{format(c.vat, { pct: vatPercentFromAmount(vat, subtotal) })}</dt><dd className="text-right tabular-nums">{money(vat)}</dd>
        <dt className="font-semibold text-pt-text">{c.total}</dt><dd className="text-right text-base font-bold tabular-nums">{money(total)}</dd>
        {dep > 0 && (
          <>
            <dt className="text-pt-muted">{c.deposit}</dt><dd className="text-right tabular-nums">{money(dep)}</dd>
            <dt className="font-semibold text-pt-text">{c.remaining}</dt><dd className="text-right font-semibold tabular-nums">{money(Math.max(0, total - dep))}</dd>
          </>
        )}
      </dl>
    </section>
  );
}
