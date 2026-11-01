import { getDictionary } from "@/i18n";
import type { WorkshopJobRow, ProductionStepLog } from "@/lib/types";
import { formatSize } from "../lib/group";
import type { DesignUrls } from "../server/queries";
import { ColorSwatches, DueBadge, StepBadge } from "./ui";

const t = getDictionary();

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[9rem_1fr] gap-2 border-t border-neutral-100 py-2 text-base first:border-t-0">
      <dt className="text-neutral-500">{label}</dt>
      <dd className="break-words">{children}</dd>
    </div>
  );
}

const dateTime = (iso: string) =>
  new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short", timeZone: "Asia/Ho_Chi_Minh" }).format(new Date(iso));

/** Production specs only (the row type has no price / contact fields). */
export function JobSpecs({ job }: { job: WorkshopJobRow }) {
  return (
    <section className="rounded-xl border border-neutral-200 bg-white p-4">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h1 className="font-mono text-xl font-semibold">{job.order_id ?? job.lead_code}</h1>
        <StepBadge step={job.step} />
      </div>
      <dl>
        <Row label={t.workshop.orderCode}>{job.order_id ?? t.workshop.pending}</Row>
        <Row label={t.workshop.leadCode}>{job.lead_code}</Row>
        <Row label={t.tapeSpec.width}>{job.width_mm === null ? "?" : `${Number(job.width_mm)} mm`}</Row>
        <Row label={t.tapeSpec.length}>{job.length_m === null ? "?" : `${Number(job.length_m)} m`}</Row>
        <Row label={t.workshop.size}>{formatSize(job)}</Row>
        <Row label={t.workshop.quantity}>{job.quantity.toLocaleString("vi-VN")}</Row>
        <Row label={t.workshop.colors}><ColorSwatches colors={job.colors} /></Row>
        <Row label={t.workshop.printText}>{job.print_text ?? "—"}</Row>
        <Row label={t.workshop.dueDate}><DueBadge dueDate={job.due_date} step={job.step} /></Row>
        <Row label={t.workshop.productionNote}>
          {job.production_note ? <span className="whitespace-pre-wrap">{job.production_note}</span> : "—"}
        </Row>
        <Row label={t.workshop.assignee}>{job.workshop_user_name ?? t.workshop.unassigned}</Row>
      </dl>
      {job.desktop_delivered && job.step !== "da_giao" && (
        <p className="mt-2 rounded bg-green-50 p-2 text-sm text-green-800">{t.workshop.desktopDelivered}</p>
      )}
    </section>
  );
}

export function JobDesign({ job, urls }: { job: WorkshopJobRow; urls: DesignUrls }) {
  return (
    <section className="flex flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-4">
      <h2 className="font-semibold">{t.workshop.designPreview}</h2>
      {urls.previewUrl ? (
        // Signed Storage URL (short TTL); next/image would need remotePatterns for the Supabase host.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={urls.previewUrl} alt={t.workshop.designPreview} className="w-full rounded-lg border border-neutral-200" />
      ) : (
        <p className="text-sm text-neutral-500">{t.workshop.noPreview}</p>
      )}
      {urls.logoUrl && (
        <a href={urls.logoUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-amber-800 underline">{t.workshop.logo}</a>
      )}
      <details>
        <summary className="cursor-pointer py-2 text-sm text-amber-800">{t.workshop.designJson}</summary>
        <pre className="max-h-80 overflow-auto rounded bg-neutral-50 p-2 text-xs">{JSON.stringify(job.design_json ?? {}, null, 2)}</pre>
      </details>
    </section>
  );
}

export function StepHistory({ log }: { log: ProductionStepLog[] }) {
  return (
    <section className="rounded-xl border border-neutral-200 bg-white p-4">
      <h2 className="mb-2 font-semibold">{t.workshop.history}</h2>
      {log.length === 0 ? (
        <p className="text-sm text-neutral-500">{t.workshop.noHistory}</p>
      ) : (
        <ol className="flex flex-col gap-2">
          {log.map((e) => (
            <li key={e.id} className="border-l-2 border-amber-600 pl-3 text-sm">
              <div className="font-medium">
                {e.from_step ? `${t.productionStep[e.from_step]} → ` : ""}{t.productionStep[e.to_step]}
              </div>
              <div className="text-neutral-500">{dateTime(e.created_at)} · {e.changed_by_name || "—"}</div>
              {e.note && <div className="whitespace-pre-wrap">{e.note}</div>}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
