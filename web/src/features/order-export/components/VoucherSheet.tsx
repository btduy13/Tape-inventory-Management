// The printable A4 voucher, same layout as the app's generateCombinedPrintInvoice (exportManager.js):
// company header, title, Kính gửi / Ngày / Địa chỉ, two-level goods table, totals, amount in words,
// signatures per document type. Print rules: the nonce'd PRINT_CSS of the page (only this sheet prints).
import { DOC_TITLE, type CompanyInfo, type DocType } from "../lib/copy";
import type { ExportLine, calculateVoucherTotals } from "../lib/voucher";
import { toVietnameseWords } from "../lib/words";

const vnd = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 });
const qty = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 3 });
const DOTS = "................................................................................";

const cell = "border border-black px-1 py-1";
const head = `${cell} font-bold`;
const sumLabel = `${cell} px-2 text-right whitespace-nowrap`;

type Props = {
  doc: DocType; company: CompanyInfo; customer: string; address: string; date: string;
  lines: ExportLine[]; totals: ReturnType<typeof calculateVoucherTotals>;
};

export function VoucherSheet({ doc, company, customer, address, date, lines, totals }: Props) {
  return (
    <div className="overflow-x-auto rounded-xl border border-pt-line bg-white print:overflow-visible print:rounded-none print:border-0">
      <article
        data-print-sheet
        aria-label={DOC_TITLE[doc]}
        className="mx-auto min-w-[680px] max-w-[210mm] p-3 font-[Arial,Helvetica,sans-serif] text-[10pt] leading-snug text-[#172033] print:min-w-0 print:max-w-none print:p-0"
      >
        <header className="mb-4 flex items-center gap-2 border-t-[6px] border-b border-t-[#2563eb] border-b-[#dbe4f0] px-4 pt-3 pb-3.5">
          {/* eslint-disable-next-line @next/next/no-img-element -- printed asset, same as the landing logo */}
          <img src="/brand/vinh-thinh-logo.png" alt="Logo" width={64} height={64} className="size-16 shrink-0 object-contain" />
          <div className="flex-1 text-center">
            <div className="mb-1 text-[15pt] font-bold uppercase text-[#1d4ed8]">{company.name}</div>
            <div className="mb-0.5 text-[#334155]">{company.address}</div>
            <div className="text-[#334155]">Hotline: {company.hotline}</div>
          </div>
          <span className="w-16 shrink-0" aria-hidden />
        </header>

        <h2 className="mt-4 mb-6 text-center text-[20pt] font-bold uppercase">{DOC_TITLE[doc]}</h2>

        <dl className="mb-4 grid grid-cols-[12%_1fr_auto] gap-y-1">
          <dt className="font-bold">Kính gửi:</dt>
          <dd className="text-[11pt] break-words">{customer || DOTS}</dd>
          <dd className="text-right font-bold">Ngày: {date}</dd>
          <dt className="font-bold">Địa chỉ:</dt>
          <dd className="col-span-2 break-words">{address || DOTS}</dd>
        </dl>

        <table className="mb-6 w-full border-collapse border border-black text-center text-[9pt]">
          <thead className="bg-[#d3d3d3]">
            <tr>
              <th rowSpan={2} className={`${head} w-[23.2%] text-left`}>Tên Sản Phẩm</th>
              <th rowSpan={2} className={`${head} w-[10.3%]`}>Quy Cách</th>
              <th colSpan={2} className={head}>In Ấn</th>
              <th rowSpan={2} className={`${head} w-[10.3%]`}>Đơn Vị Tính</th>
              <th colSpan={3} className={head}>Đơn Giá Theo Số Lượng</th>
              <th rowSpan={2} className={`${head} w-[11%]`}>Tổng Cộng</th>
            </tr>
            <tr>
              <th className={`${head} w-[10.3%]`}>Màu Sắc</th>
              <th className={`${head} w-[10.3%]`}>Màu Keo</th>
              <th className={`${head} w-[11.3%]`}>Số lượng</th>
              <th className={`${head} w-[11.3%]`}>Đơn Giá</th>
              <th className={`${head} w-[6%]`}>VAT</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l, i) => (
              <tr key={`${l.id}-${i}`} className="break-inside-avoid">
                <td className={`${cell} text-left`}>{l.product}</td>
                <td className={cell}>{l.specs}</td>
                <td className={cell}>{l.text_color}</td>
                <td className={cell}>{l.bg_color}</td>
                <td className={cell}>{l.unit}</td>
                <td className={cell}>{qty.format(l.quantity)}</td>
                <td className={cell}>{vnd.format(l.price)}</td>
                <td className={cell}>{vnd.format(l.vat || 0)}</td>
                <td className={cell}>{vnd.format(l.total)}</td>
              </tr>
            ))}
            <tr>
              <td colSpan={6} className="border-0" />
              <td colSpan={2} className={`${sumLabel} font-semibold`}>VAT</td>
              <td className={sumLabel}>{vnd.format(totals.vat)}</td>
            </tr>
            <tr className="font-bold">
              <td colSpan={6} className="border-0" />
              <td colSpan={2} className={`${sumLabel} bg-[#f1f5f9]`}>Tổng cộng</td>
              <td className={`${sumLabel} bg-[#f1f5f9]`}>{vnd.format(totals.totalPayable)}</td>
            </tr>
            <tr>
              <td colSpan={6} className="border-0" />
              <td colSpan={2} className={sumLabel}>Tiền cọc</td>
              <td className={`${sumLabel} text-[#dc2626]`}>{totals.deposit > 0 ? "-" : ""}{vnd.format(totals.deposit)}</td>
            </tr>
            <tr className="font-bold text-[#1e3a8a]">
              <td colSpan={6} className="border-0" />
              <td colSpan={2} className={`${sumLabel} bg-[#eaf2ff]`}>Còn lại cần thu</td>
              <td className={`${sumLabel} bg-[#eaf2ff] text-[11pt]`}>{vnd.format(totals.remaining)}</td>
            </tr>
          </tbody>
        </table>

        <p className="mb-8 italic">
          Số tiền bằng chữ: <strong>{toVietnameseWords(totals.remaining)} đồng chẵn.</strong>
        </p>

        <Signatures doc={doc} company={company} />
      </article>
    </div>
  );
}

function Signatures({ doc, company }: { doc: DocType; company: CompanyInfo }) {
  if (doc === "phieu_giao_hang") {
    return (
      <div className="mt-10 flex justify-between px-5 pb-24 text-[9pt] font-bold break-inside-avoid">
        <span>NGƯỜI GIAO HÀNG</span>
        <span>NGƯỜI NHẬN HÀNG</span>
      </div>
    );
  }
  return (
    <div className="mt-10 flex justify-between px-5 text-[9pt] font-bold break-inside-avoid">
      <span>NGƯỜI NHẬN HÀNG</span>
      <div className="flex max-w-[60%] flex-col items-end text-right leading-snug">
        <span>{company.name}</span>
        <span className="mt-0.5 text-[8pt] font-normal">ĐẠI DIỆN THƯƠNG MẠI</span>
        <span className="h-16" aria-hidden />
        <span>{company.representative}</span>
        <span className="text-[8pt] font-normal italic">HP:{company.representativePhone}</span>
      </div>
    </div>
  );
}
