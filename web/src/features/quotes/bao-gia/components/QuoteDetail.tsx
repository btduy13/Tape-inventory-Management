// /admin/bao-gia/[id] body: header (customer, code, type, date, status, actions), the size -> axis
// table with totals, and the A4 sheet that only shows when printing (nonce'd EXPORT_PRINT_CSS).
import { format, getDictionary } from "@/i18n";
import { ROUTES } from "@/lib/routes";
import { PageHeader } from "@/features/portal-ui/components/Section";
import { linkClass } from "@/features/portal-ui/components/styles";
import { dateVn } from "@/features/admin-orders/lib/format";
import type { CompanyInfo } from "@/features/order-export/lib/copy";
import { quoteStatus } from "../lib/list";
import { normalizeItems, type QuoteRow } from "../lib/stored";
import { PrintButton } from "./PrintButton";
import { QuoteLines } from "./QuoteLines";
import { QuoteRowActions, type QuoteCan } from "./QuoteRowActions";
import { QuoteSheet } from "./QuoteSheet";
import { QuoteStatusBadge, typeShort } from "./QuoteStatusBadge";

const c = getDictionary().baoGia;
const text = (v: unknown) => (v === null || v === undefined ? "" : String(v).trim());

type Props = { type: string; quote: QuoteRow; company: CompanyInfo; can: QuoteCan };

export function QuoteDetail({ type, quote, company, can }: Props) {
  const id = text(quote.id);
  const customer = text(quote.ten_khach_hang);
  const phone = text(quote.sdt_khach_hang);
  const address = text(quote.dia_chi_khach_hang);
  const product = text(quote.ten_hang);
  const items = normalizeItems(quote, type);

  return (
    <>
      <div className="flex flex-col gap-5 print:hidden">
        <PageHeader
          title={customer || product || format(c.detailTitle, { id })}
          breadcrumbs={[{ label: c.listTitle, href: ROUTES.adminQuotes }, { label: id }]}
          meta={<QuoteStatusBadge status={quoteStatus(quote)} size="md" />}
          description={[id, typeShort(type), format(c.created, { date: dateVn(quote.thoi_gian) })].join(" · ")}
          actions={
            <>
              <PrintButton variant="secondary" label={c.print} />
              <QuoteRowActions type={type} id={id} can={can} variant="detail" afterDelete={ROUTES.adminQuotes} />
            </>
          }
        />
        {(product || phone || address) && (
          <p className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-pt-text">
            {product && customer && <span className="font-semibold">{product}</span>}
            {phone && <a href={`tel:${phone.replace(/[^\d+]/g, "")}`} className={`${linkClass} tabular-nums`}>{phone}</a>}
            {address && <span className="text-pt-muted">{address}</span>}
          </p>
        )}
        <QuoteLines items={items} productName={product || "—"} deposit={quote.tien_coc} />
      </div>
      <div className="hidden print:block">
        <QuoteSheet type={type} quote={quote} company={company} />
      </div>
    </>
  );
}
