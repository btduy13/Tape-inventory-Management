// /admin overview: KPI cards, counts per status, and short "Cần xử lý" queues (server component).
import Link from "next/link";
import { format, getDictionary } from "@/i18n";
import { ROUTES } from "@/lib/routes";
import { LEAD_STATUSES } from "@/lib/types";
import {
  DataTable, ErrorState, LEAD_TONE, StatCard, StatGrid, StatusBadge, buttonClass, linkClass, type Column,
} from "@/features/portal-ui";
import { OPEN_STATUSES, UNASSIGNED, filteredHref } from "../lib/lead-list";
import { formatDateTime } from "../lib/timeline";
import { CONTAIN_SCROLLERS } from "./contain-scrollers";
import type { LeadOverview as Overview, QueueLead } from "../server/overview";

const t = getDictionary();
const c = t.leadsUi;

const queueColumns = (dateOf: (r: QueueLead) => string, dateLabel: string): Column<QueueLead>[] => [
  { key: "code", header: c.colCode, mobile: "title", cell: (r) => r.code },
  {
    key: "customer",
    header: c.colCustomer,
    cell: (r) => (
      <span className="flex flex-col">
        <span>{r.customer_name}</span>
        {r.company && <span className="text-xs text-pt-muted">{r.company}</span>}
      </span>
    ),
  },
  { key: "date", header: dateLabel, className: "text-pt-muted", cell: (r) => formatDateTime(dateOf(r)) },
];

function Queue({ id, title, rows, href, dateOf, dateLabel }: { id: string; title: string; rows: QueueLead[]; href: string; dateOf: (r: QueueLead) => string; dateLabel: string }) {
  // Own heading row (not Section's): the 44px "Xem tất cả" button centres on the heading line.
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3">
      <div className="flex min-h-11 items-center justify-between gap-2">
        <h3 id={id} className="text-base font-semibold text-pt-text">{title}</h3>
        {rows.length > 0 && <Link href={href} className={buttonClass("ghost", "sm", "shrink-0")}>{c.seeAll}</Link>}
      </div>
      <DataTable
        caption={title}
        columns={queueColumns(dateOf, dateLabel)}
        rows={rows}
        rowKey={(r) => r.id}
        rowHref={(r) => ROUTES.adminLead(r.id)}
        empty={{ title: c.queueEmpty }}
      />
    </section>
  );
}

export function LeadOverview({ data, basePath }: { data: Overview; basePath: string }) {
  const { counts, queues } = data;
  const inShop = counts.production + counts.shipping;
  return (
    <div className={`flex flex-col gap-6 ${CONTAIN_SCROLLERS}`}>
      {data.error && <ErrorState body={c.loadError} />}
      <StatGrid>
        <StatCard label={c.kpiUnassigned} value={data.unassigned} tone="red" hint={c.kpiUnassignedHint} href={filteredHref(basePath, { status: OPEN_STATUSES, assignee: UNASSIGNED })} />
        <StatCard label={c.kpiAwaitingQuote} value={counts.consulting} tone={LEAD_TONE.consulting} hint={c.kpiAwaitingQuoteHint} href={filteredHref(basePath, { status: ["consulting"] })} />
        <StatCard label={c.kpiQuoted} value={counts.quoted} tone={LEAD_TONE.quoted} hint={c.kpiQuotedHint} href={filteredHref(basePath, { status: ["quoted"] })} />
        <StatCard label={c.kpiAccepted} value={counts.accepted} tone={LEAD_TONE.accepted} hint={c.kpiAcceptedHint} href={filteredHref(basePath, { status: ["accepted"] })} />
        <StatCard
          label={c.kpiInProduction}
          value={inShop}
          tone={LEAD_TONE.production}
          hint={data.overdueJobs > 0 ? format(c.kpiOverdueHint, { count: data.overdueJobs }) : c.kpiInProductionHint}
          href={filteredHref(basePath, { status: ["production", "shipping"] })}
        />
      </StatGrid>

      <nav aria-label={c.byStatus} className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-pt-muted">{c.byStatus}</h2>
        {/* Wraps instead of scrolling sideways: every status stays visible at any width. */}
        <ul className="flex flex-wrap gap-2">
          {LEAD_STATUSES.map((s) => (
            <li key={s} className="shrink-0">
              <Link
                href={filteredHref(basePath, { status: [s] })}
                className="inline-flex min-h-11 items-center gap-2 rounded-full border border-pt-line bg-pt-surface pl-1.5 pr-4 text-sm hover:border-vt-blue"
              >
                <StatusBadge status={s} />
                <span className="font-semibold tabular-nums text-pt-text">{counts[s].toLocaleString("vi-VN")}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <section aria-labelledby="can-xu-ly" className="flex flex-col gap-3">
        <h2 id="can-xu-ly" className="text-lg font-semibold text-pt-text">{c.needsAction}</h2>
        <div className="grid gap-6 xl:grid-cols-3">
          <Queue id="hang-cho-chua-phan-cong" title={c.queueUnassigned} rows={queues.unassigned} href={filteredHref(basePath, { status: ["new"], assignee: UNASSIGNED })} dateOf={(r) => r.created_at} dateLabel={c.colCreated} />
          <Queue id="hang-cho-tu-van" title={c.queueConsulting} rows={queues.consulting} href={filteredHref(basePath, { status: ["consulting"] })} dateOf={(r) => r.updated_at} dateLabel={c.colUpdated} />
          <Queue id="hang-cho-da-dong-y" title={c.queueAccepted} rows={queues.accepted} href={filteredHref(basePath, { status: ["accepted"] })} dateOf={(r) => r.updated_at} dateLabel={c.colUpdated} />
        </div>
        {data.overdueJobs > 0 && (
          <p className="text-sm text-pt-red-ink">
            {format(c.kpiOverdueHint, { count: data.overdueJobs })}.{" "}
            <Link href={ROUTES.workshop} className={linkClass}>{t.portalUi.navWorkshop}</Link>
          </p>
        )}
      </section>
    </div>
  );
}
