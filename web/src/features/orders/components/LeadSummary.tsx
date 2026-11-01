import { getDictionary } from "@/i18n";
import type { Design, Lead } from "@/lib/types";
import { formatDateTime } from "../lib/timeline";
import { StatusBadge } from "./StatusBadge";

const t = getDictionary();

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[8rem_1fr] gap-2 py-1 text-sm">
      <dt className="text-neutral-500">{label}</dt>
      <dd className="break-words">{value ?? "—"}</dd>
    </div>
  );
}

export function LeadSummary({
  lead,
  design,
  previewUrl,
  assigneeName,
}: {
  lead: Lead;
  design: Design | null;
  previewUrl: string | null;
  assigneeName: string | null;
}) {
  return (
    <section className="grid gap-6 rounded-lg border border-neutral-200 p-4 md:grid-cols-2">
      <div>
        <div className="mb-2 flex items-center gap-3">
          <h1 className="font-mono text-lg font-semibold">{lead.code}</h1>
          <StatusBadge status={lead.status} />
        </div>
        <dl>
          <Row label={t.orders.customer} value={lead.customer_name} />
          <Row label={t.orders.phone} value={<a className="text-amber-800 hover:underline" href={`tel:${lead.phone}`}>{lead.phone}</a>} />
          <Row label={t.orders.email} value={lead.email} />
          <Row label={t.orders.company} value={lead.company} />
          <Row label={t.orders.quantity} value={lead.quantity.toLocaleString("vi-VN")} />
          <Row label={t.orders.customerNote} value={lead.customer_note ? <span className="whitespace-pre-wrap">{lead.customer_note}</span> : null} />
          <Row label={t.orders.assignee} value={assigneeName ?? (lead.assigned_to ? "—" : t.assignment.unassigned)} />
          <Row label={t.orders.createdAt} value={formatDateTime(lead.created_at)} />
          {lead.production_order_id && <Row label={t.orders.productionOrder} value={<span className="font-mono">{lead.production_order_id}</span>} />}
        </dl>
      </div>
      <div>
        <h2 className="mb-2 font-semibold">{t.orders.design}</h2>
        {design ? (
          <dl>
            {/* Customer-chosen size (0022): width from the admin list, free length within the range. */}
            <Row label={t.tapeSpec.width} value={`${Number(design.width_mm)} mm`} />
            <Row label={t.tapeSpec.length} value={`${Number(design.length_m)} m`} />
            <Row label={t.orders.size} value={`${Number(design.width_mm)}mm × ${Number(design.length_m)}m × ${Number(design.thickness_mic)}mic`} />
            <Row label={t.orders.printText} value={design.print_text} />
            <Row
              label={t.orders.colors}
              value={
                <span className="flex flex-wrap gap-2 font-mono text-xs">
                  {design.colors.map((c) => <span key={c} className="rounded border border-neutral-300 px-1.5 py-0.5">{c}</span>)}
                </span>
              }
            />
          </dl>
        ) : (
          <p className="text-sm text-neutral-500">{t.common.none}</p>
        )}
        {previewUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL, not optimisable
          <img src={previewUrl} alt={t.orders.designPreview} className="mt-3 max-h-64 rounded border border-neutral-200 object-contain" />
        )}
      </div>
    </section>
  );
}
