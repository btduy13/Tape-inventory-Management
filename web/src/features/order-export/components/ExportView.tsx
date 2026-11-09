// /admin/don-hang/xuat: without ?ids= the order picker, with ?ids= the preview editor + voucher.
import { createClient } from "@/lib/supabase/server";
import { ROUTES } from "@/lib/routes";
import { ErrorState, PageHeader } from "@/features/portal-ui";
import { orderIdSchema } from "@/features/admin-orders/lib/schemas";
import { COMPANY, exportCopy as c, parseDocType, type CompanyInfo } from "../lib/copy";
import { EXPORT_PATH, exportHref } from "../lib/paths";
import { parsePickerFilter, pickerYears } from "../lib/picker";
import { draftOf } from "../lib/voucher";
import { listPickerOrders, loadExportOrders, PICKER_LIMIT } from "../server/queries";
import { ExportPreview } from "./ExportPreview";
import { ExportSelector } from "./ExportSelector";

/** A4 page; on print only the voucher ([data-print-sheet]) shows. Rendered with the CSP nonce. */
export const EXPORT_PRINT_CSS =
  "@page{size:A4 portrait;margin:12mm}" +
  "@media print{body *:not(:has([data-print-sheet])):not([data-print-sheet]):not([data-print-sheet] *){display:none!important}" +
  "body *:has([data-print-sheet]){padding:0!important;margin:0!important;gap:0!important;min-height:0!important;" +
  "overflow:visible!important;max-height:none!important;border:0!important}}";

type Sp = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

// The app's utils.companyInfo (hotline and representative phone as printed by the app).
const company = (): CompanyInfo => COMPANY;

const today = () =>
  new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Asia/Ho_Chi_Minh" }).format(new Date());

export async function ExportView({ searchParams }: { searchParams: Sp }) {
  const db = await createClient();
  const doc = parseDocType(one(searchParams.doc));
  const header = <PageHeader title={c.title} breadcrumbs={[{ label: "Đơn hàng", href: ROUTES.adminOrders }, { label: "Xuất đơn" }]} />;
  const idsRaw = one(searchParams.ids);

  if (idsRaw) {
    const ids = [...new Set(idsRaw.split(",").map((s) => s.trim()).filter(Boolean))];
    const back = exportHref([], doc);
    if (ids.length > PICKER_LIMIT) return <>{header}<ErrorState body={c.tooMany} /></>;
    if (ids.some((id) => !orderIdSchema.safeParse(id).success)) return <>{header}<ErrorState body={c.loadFailed(ids.join(", "))} /></>;
    const load = await loadExportOrders(db, ids);
    if (!load.ok) return <>{header}<ErrorState body={c.loadFailed(load.missing.join(", "))} /></>;
    return (
      <>
        <div className="print:hidden">{header}</div>
        <h2 className="text-lg font-semibold print:hidden">{c.previewTitle}</h2>
        <ExportPreview draft={draftOf(load.orders)} doc={doc} company={company()} date={today()} backHref={back} />
      </>
    );
  }

  const filter = parsePickerFilter(searchParams);
  const rows = await listPickerOrders(db, filter);
  return (
    <>
      {header}
      {rows ? (
        <ExportSelector rows={rows} filter={filter} years={pickerYears()} capped={rows.length >= PICKER_LIMIT} action={EXPORT_PATH} doc={doc} />
      ) : (
        <ErrorState body={c.listFailed} />
      )}
    </>
  );
}
