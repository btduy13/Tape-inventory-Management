// Printable A4 quote, same layout as the app's generateAndSaveQuotePDF (quotations.js:1044-1231):
// accent bar, company + "BẢNG BÁO GIÁ", customer, one row per size then per axis, totals, words,
// signatures. Printed with the page's nonce'd EXPORT_PRINT_CSS (only [data-print-sheet] prints).
import { dateVn } from "@/features/admin-orders/lib/format";
import { number, vatPercentFromAmount } from "@/features/admin-orders/lib/order-math";
import type { CompanyInfo } from "@/features/order-export/lib/copy";
import { toVietnameseWords } from "@/features/order-export/lib/words";
import { quoteBundle } from "../lib/bundle";
import { TYPE_LABEL } from "../lib/paths";
import { normalizeItems, type QuoteRow } from "../lib/stored";

const fmt = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
const vnd = (v: number) => `${fmt.format(Math.round(v))}đ`;
const cell = "border border-[#dbe4f0] px-2 py-1.5 align-top";

export function QuoteSheet({ type, quote, company }: { type: string; quote: QuoteRow; company: CompanyInfo }) {
  const items = normalizeItems(quote, type);
  const axes = items.flatMap((item, itemIndex) => item.axes.map((a) => ({ ...a, itemIndex })));
  const b = quoteBundle(items);
  const subtotal = b.productSubtotal + b.axisSubtotal;
  const vat = b.vat + b.axisVat;
  const total = subtotal + vat;
  const deposit = Math.max(0, Math.round(number(quote.tien_coc as number)));
  const remaining = Math.max(0, total - deposit);
  const color = (d: Record<string, unknown> | undefined) =>
    `${d?.glueColor || quote.mau_keo || ""} ${d?.printColor || d?.color || quote.mau_sac || ""}`.trim() || "-";

  return (
    <div className="overflow-x-auto rounded-xl border border-pt-line bg-white print:overflow-visible print:rounded-none print:border-0">
      <article data-print-sheet aria-label="Bảng báo giá" className="mx-auto min-w-[680px] max-w-[210mm] p-6 font-[Segoe_UI,Arial,sans-serif] text-[12px] leading-normal text-[#172033] print:min-w-0 print:max-w-none print:p-0">
        <div className="mb-4 h-2 rounded-full bg-[#2563eb]" />
        <header className="mb-4 grid grid-cols-[minmax(0,1fr)_190px] gap-6">
          <div className="flex gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element -- printed asset, same as the voucher logo */}
            <img src="/brand/vinh-thinh-logo.png" alt="Logo" width={56} height={56} className="size-14 shrink-0 object-contain" />
            <div className="min-w-0">
              <p className="font-bold uppercase text-[#1d4ed8]">{company.name}</p>
              <p>Địa chỉ: {company.address}</p>
              <p>Hotline: {company.hotline}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[18px] font-bold">BẢNG BÁO GIÁ</p>
            <p className="mt-1 inline-block rounded-full bg-[#eff6ff] px-3 py-0.5 font-semibold text-[#1d4ed8]">Số {String(quote.id)}</p>
            <p className="mt-1">Ngày {dateVn(quote.thoi_gian)}</p>
          </div>
        </header>

        <h3 className="mb-1 font-bold uppercase text-[#1d4ed8]">Thông tin khách hàng</h3>
        <p>Khách hàng: <strong>{String(quote.ten_khach_hang ?? "")}</strong></p>
        <p className="mb-4">Loại hàng: {TYPE_LABEL[type] ?? "Trục In"}</p>

        <h3 className="mb-1 font-bold uppercase text-[#1d4ed8]">Chi tiết báo giá</h3>
        <table className="mb-4 w-full border-collapse">
          <thead className="bg-[#eff6ff] text-left">
            <tr>
              <th className={`${cell} w-[6%] text-center`}>STT</th><th className={cell}>Tên sản phẩm</th>
              <th className={`${cell} w-[20%]`}>Quy cách</th><th className={`${cell} w-[10%] text-right`}>Số lượng</th>
              <th className={`${cell} w-[12%] text-right`}>Đơn giá</th><th className={`${cell} w-[12%] text-right`}>Thành tiền</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={`s${i}`}>
                <td className={`${cell} text-center`}>{i + 1}</td>
                <td className={cell}><strong>{String(quote.ten_hang ?? "")}</strong><br /><small>Màu keo/sắc: {color(item.details)}</small></td>
                <td className={cell}>{item.specification}</td>
                <td className={`${cell} text-right`}>{fmt.format(item.quantity)}</td>
                <td className={`${cell} text-right`}>{vnd(item.unitPrice)}</td>
                <td className={`${cell} text-right font-bold`}>{vnd(item.total)}</td>
              </tr>
            ))}
            {axes.map((a, i) => (
              <tr key={`a${i}`}>
                <td className={`${cell} text-center`}>{items.length + i + 1}</td>
                <td className={cell}><strong>{a.name || "Trục mới"}</strong><br /><small>Trục của kích thước {a.itemIndex + 1}</small></td>
                <td className={cell}>Chu vi: {a.circumference ?? "-"}</td>
                <td className={`${cell} text-right`}>{fmt.format(a.quantity)}</td>
                <td className={`${cell} text-right`}>{vnd(a.unitPrice)}</td>
                <td className={`${cell} text-right font-bold`}>{vnd(a.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <table className="mb-3 ml-auto w-full max-w-[320px] border-collapse">
          <tbody>
            {vat > 0 ? (
              <>
                <Line label="Giá gốc (chưa VAT):" value={vnd(subtotal)} />
                <Line label={`VAT (${vatPercentFromAmount(vat, subtotal)}% tổng):`} value={vnd(vat)} />
                <Line label="Giá gồm VAT:" value={vnd(total)} />
              </>
            ) : (
              <Line label="Tổng tiền hàng:" value={vnd(subtotal)} />
            )}
            <Line label="Đặt cọc trước:" value={vnd(deposit)} />
            <tr className="bg-[#eff6ff] text-[14px] font-bold text-[#1d4ed8]">
              <td className="px-2 py-1.5">Còn lại cần thu:</td><td className="px-2 py-1.5 text-right">{vnd(remaining)}</td>
            </tr>
          </tbody>
        </table>

        <p><strong>Bằng chữ:</strong> {toVietnameseWords(remaining)} đồng chẵn</p>
        <p className="mt-1 italic text-[#64748b]">Báo giá có hiệu lực theo thỏa thuận tại thời điểm xác nhận đơn hàng.</p>

        <div className="mt-8 grid grid-cols-2 text-center">
          <div><p className="font-bold">ĐẠI DIỆN KHÁCH HÀNG</p><p className="mt-16 text-[#64748b]">(Ký, ghi rõ họ tên)</p></div>
          <div>
            <p className="font-bold">NGƯỜI BÁO GIÁ</p>
            <p className="mt-16 font-semibold">{company.representative}</p>
            <p className="mt-1 text-[#64748b]">HP: {company.representativePhone}</p>
          </div>
        </div>
      </article>
    </div>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <tr className="border-b border-[#dbe4f0]">
      <td className="px-2 py-1">{label}</td><td className="px-2 py-1 text-right">{value}</td>
    </tr>
  );
}
