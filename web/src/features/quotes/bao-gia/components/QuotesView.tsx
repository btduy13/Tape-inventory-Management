// "Các đơn báo giá": filters (từ khóa, loại, tháng) and the tree quote -> Kích thước -> Trục
// (quotations.js:905-1026). Server component; the table scrolls inside its own box on phones.
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ErrorState, EmptyState } from "@/features/portal-ui/components/States";
import { buttonClass, inputClass, surfaceClass } from "@/features/portal-ui/components/styles";
import { dateVn, money, plain } from "@/features/admin-orders/lib/format";
import { grandTotal, listPriceSummary, monthRange, normalizeItems } from "../lib/stored";
import { TYPE_LABEL } from "../lib/paths";
import { listQuotes } from "../server/queries";
import { QuoteRowActions, type QuoteCan } from "./QuoteRowActions";

type Props = { searchParams: Record<string, string | string[] | undefined>; can: QuoteCan };
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
const TYPES = ["all", "bang_keo_in", "bang_keo", "truc_in", "thank_you"];

export async function QuotesView({ searchParams, can }: Props) {
  const q = one(searchParams.q).trim().slice(0, 100);
  const type = TYPES.includes(one(searchParams.type)) ? one(searchParams.type) : "all";
  const month = Number(one(searchParams.month));
  const [from, to] = month >= 1 && month <= 12 ? monthRange(month) : [null, null];
  const rows = await listQuotes(await createClient(), { type, q, from, to });

  return (
    <div className="flex flex-col gap-4">
      <form method="get" className={`${surfaceClass} grid grid-cols-1 gap-3 p-4 sm:grid-cols-4 sm:items-end`}>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-pt-text">
          Tìm kiếm từ khóa
          <input name="q" defaultValue={q} placeholder="Mã, tên hàng, khách" className={inputClass} />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-pt-text">
          Loại báo giá
          <select name="type" defaultValue={type} className={inputClass}>
            {TYPES.map((t) => <option key={t} value={t}>{t === "all" ? "Tất cả" : TYPE_LABEL[t]}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-pt-text">
          Tháng lọc
          <select name="month" defaultValue={month >= 1 && month <= 12 ? String(month) : ""} className={inputClass}>
            <option value="">Tất cả</option>
            {Array.from({ length: 12 }, (_, i) => <option key={i} value={i + 1}>Tháng {i + 1}</option>)}
          </select>
        </label>
        <button type="submit" className={buttonClass("secondary")}>Làm mới</button>
      </form>

      {rows === null ? (
        <ErrorState body="Không tải được danh sách báo giá." />
      ) : rows.length === 0 ? (
        <EmptyState title="Chưa có báo giá" />
      ) : (
        <div className={`${surfaceClass} overflow-x-auto`}>
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-pt-grey-tint text-left text-xs uppercase text-pt-muted">
              <tr>
                <th className="px-3 py-2">Mã báo giá</th><th className="px-3 py-2">Ngày tạo</th><th className="px-3 py-2">Tên hàng</th>
                <th className="px-3 py-2">Tên khách hàng</th><th className="px-3 py-2 text-right">Số lượng</th>
                <th className="px-3 py-2 text-right">Đơn giá bán</th><th className="px-3 py-2 text-right">Thành tiền</th>
                <th className="px-3 py-2 text-right">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ type: t, quote }) => {
                const id = String(quote.id);
                const items = normalizeItems(quote, t);
                const price = listPriceSummary(quote, items);
                const axes = items.reduce((n, i) => n + i.axes.length, 0);
                return [
                  <tr key={`${t}:${id}`} className="border-t border-pt-line bg-pt-surface align-top">
                    <td className="px-3 py-2 font-semibold">{id}</td>
                    <td className="px-3 py-2">{dateVn(quote.thoi_gian)}</td>
                    <td className="px-3 py-2">
                      <span className="font-semibold">{String(quote.ten_hang ?? "")}</span> <span className="text-pt-muted">({TYPE_LABEL[t]})</span>
                      <small className="block text-pt-muted">{items.length} kích thước{axes ? ` · ${axes} trục` : ""}</small>
                    </td>
                    <td className="px-3 py-2">{String(quote.ten_khach_hang ?? "")}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{plain(price.quantity)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{price.multiple ? `Nhiều kích thước / TB ${money(price.unitPrice)}` : money(price.unitPrice)}</td>
                    <td className="px-3 py-2 text-right font-bold tabular-nums">{money(grandTotal(items))}</td>
                    <td className="px-3 py-2"><QuoteRowActions type={t} id={id} can={can} /></td>
                  </tr>,
                  ...items.flatMap((item, i) => [
                    <tr key={`${t}:${id}:${i}`} className="border-t border-pt-line text-pt-text">
                      <td className="px-3 py-1.5 pl-6 text-pt-muted" colSpan={2}>{i === items.length - 1 ? "└─" : "├─"} Kích thước {i + 1}</td>
                      <td className="px-3 py-1.5" colSpan={2}>
                        <span className="font-semibold">{item.specification}</span>
                        {item.details?.printColor ? <small className="block text-pt-muted">Màu in: {String(item.details.printColor)}</small> : null}
                      </td>
                      <td className="px-3 py-1.5 text-right tabular-nums">{plain(item.quantity)}</td>
                      <td className="px-3 py-1.5 text-right tabular-nums">{money(item.unitPrice)}</td>
                      <td className="px-3 py-1.5 text-right tabular-nums">{money(item.total)}</td>
                      <td />
                    </tr>,
                    ...item.axes.map((a, j) => (
                      <tr key={`${t}:${id}:${i}:${j}`} className="text-pt-muted">
                        <td className="px-3 py-1 pl-10" colSpan={2}>└─ Trục {j + 1}</td>
                        <td className="px-3 py-1" colSpan={2}>{a.name}{a.circumference ? ` · Chu vi ${plain(a.circumference)}` : ""}</td>
                        <td className="px-3 py-1 text-right tabular-nums">{plain(a.quantity)}</td>
                        <td className="px-3 py-1 text-right tabular-nums">{money(a.unitPrice)}</td>
                        <td className="px-3 py-1 text-right tabular-nums">
                          {money(a.total)}<small className="block">VAT {plain(a.vatPercent)}% = {money(a.vat)}</small>
                        </td>
                        <td />
                      </tr>
                    )),
                  ]),
                ];
              })}
            </tbody>
          </table>
        </div>
      )}
      {rows && rows.length > 0 && <p className="text-xs text-pt-muted">{rows.length} báo giá · <Link href="?" className="underline">Bỏ lọc</Link></p>}
    </div>
  );
}
