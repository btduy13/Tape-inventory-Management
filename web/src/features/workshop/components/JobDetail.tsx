// Job detail blocks. Production specs only: WorkshopJobRow has no price or customer contact fields.
import { Section, linkClass, surfaceClass } from "@/features/portal-ui";
import { getDictionary } from "@/i18n";
import type { ProductionStepLog, WorkshopJobRow } from "@/lib/types";
import { wsCopy } from "../lib/copy";
import type { DesignUrls } from "../server/queries";
import { ColorSwatches, DueBadge } from "./ui";

const t = getDictionary();

const num = (n: number | string | null) => (n === null || n === undefined ? "?" : Number(n).toLocaleString("vi-VN"));

const dateTime = (iso: string) =>
  new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short", timeZone: "Asia/Ho_Chi_Minh" }).format(new Date(iso));

/** Big numbers the floor reads from across the bench. */
function SpecTile({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-pt-line bg-pt-canvas px-4 py-3">
      <dt className="text-sm text-pt-muted">{label}</dt>
      <dd className="flex items-baseline gap-1">
        <span className="text-3xl font-bold leading-none tabular-nums text-pt-text">{value}</span>
        <span className="text-base font-medium text-pt-muted">{unit}</span>
      </dd>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[minmax(7rem,10rem)_1fr] gap-3 border-t border-pt-line py-2.5 first:border-t-0">
      <dt className="text-sm text-pt-muted">{label}</dt>
      <dd className="min-w-0 break-words text-base text-pt-text">{children}</dd>
    </div>
  );
}

export function JobSpecs({ job }: { job: WorkshopJobRow }) {
  return (
    <Section title={wsCopy.specs}>
      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <SpecTile label={wsCopy.width} value={num(job.width_mm)} unit="mm" />
        <SpecTile label={wsCopy.length} value={num(job.length_m)} unit="m" />
        <SpecTile label={wsCopy.thickness} value={num(job.thickness_mic)} unit="mic" />
        <SpecTile label={wsCopy.quantity} value={job.quantity.toLocaleString("vi-VN")} unit="cuộn" />
      </dl>
      <dl>
        <Row label={t.workshop.colors}><ColorSwatches colors={job.colors} size="md" /></Row>
        <Row label={t.workshop.printText}>
          {job.print_text ? <span className="text-lg font-semibold">“{job.print_text}”</span> : "—"}
        </Row>
        <Row label={t.workshop.dueDate}><DueBadge dueDate={job.due_date} step={job.step} size="md" /></Row>
        <Row label={t.workshop.orderCode}>{job.order_id ?? wsCopy.orderPending}</Row>
        <Row label={t.workshop.leadCode}>{job.lead_code}</Row>
        <Row label={t.workshop.assignee}>{job.workshop_user_name ?? t.workshop.unassigned}</Row>
      </dl>
      {job.production_note && (
        <div className="rounded-lg border border-pt-yellow-ink/30 bg-pt-yellow-tint px-4 py-3 text-pt-yellow-ink">
          <p className="text-sm font-semibold">{wsCopy.noteFromOffice}</p>
          <p className="whitespace-pre-wrap text-base">{job.production_note}</p>
        </div>
      )}
      {job.desktop_delivered && job.step !== "da_giao" && (
        <p className="rounded-lg bg-pt-green-tint px-3 py-2 text-sm font-medium text-pt-green-ink">{t.workshop.desktopDelivered}</p>
      )}
    </Section>
  );
}

export function JobDesign({ job, urls }: { job: WorkshopJobRow; urls: DesignUrls }) {
  return (
    <Section title={t.workshop.designPreview}>
      {urls.previewUrl ? (
        // Signed Storage URL (short TTL); next/image would need remotePatterns for the Supabase host.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={urls.previewUrl} alt={t.workshop.designPreview} className={`${surfaceClass} w-full`} />
      ) : (
        <p className="text-sm text-pt-muted">{t.workshop.noPreview}</p>
      )}
      {urls.logoUrl && (
        <a href={urls.logoUrl} target="_blank" rel="noopener noreferrer" className={`${linkClass} inline-flex min-h-11 items-center`}>{t.workshop.logo}</a>
      )}
      <details>
        <summary className="inline-flex min-h-11 cursor-pointer items-center text-sm font-medium text-vt-blue">{t.workshop.designJson}</summary>
        <pre className="max-h-80 overflow-auto rounded-lg bg-pt-canvas p-3 text-xs">{JSON.stringify(job.design_json ?? {}, null, 2)}</pre>
      </details>
    </Section>
  );
}

export function StepHistory({ log }: { log: ProductionStepLog[] }) {
  return (
    <Section title={t.workshop.history}>
      {log.length === 0 ? (
        <p className="text-sm text-pt-muted">{t.workshop.noHistory}</p>
      ) : (
        <ol className="flex flex-col gap-3">
          {log.map((e) => (
            <li key={e.id} className="border-l-4 border-vt-blue pl-3 text-sm">
              <div className="font-semibold text-pt-text">
                {e.from_step ? `${t.productionStep[e.from_step]} → ` : ""}{t.productionStep[e.to_step]}
              </div>
              <div className="text-pt-muted">{dateTime(e.created_at)} · {e.changed_by_name || "—"}</div>
              {e.note && <div className="mt-1 whitespace-pre-wrap text-pt-text">{e.note}</div>}
            </li>
          ))}
        </ol>
      )}
    </Section>
  );
}
