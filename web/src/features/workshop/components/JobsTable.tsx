// Table view (cards on phones) with sortable headers + pagination from the URL state.
import { DataTable, StepBadge, type Column, type DataTableList } from "@/features/portal-ui";
import { getDictionary } from "@/i18n";
import { ROUTES } from "@/lib/routes";
import type { AppRole } from "@/lib/types";
import { wsCopy } from "../lib/copy";
import { formatSize } from "../lib/group";
import type { JobListRow } from "../lib/list";
import { AdvanceStepForm } from "./AdvanceStepForm";
import { DueBadge } from "./ui";

const t = getDictionary();

const dateTime = (iso: string) =>
  new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short", timeZone: "Asia/Ho_Chi_Minh" }).format(new Date(iso));

function columns(role: AppRole): Column<JobListRow>[] {
  const cols: Column<JobListRow>[] = [
    {
      key: "code", header: wsCopy.colCode, sortKey: "code", mobile: "title",
      cell: (r) => (
        <span className="flex flex-col">
          <span className="text-base">{r.code}</span>
          {r.order_id && <span className="text-xs font-normal text-pt-muted">{r.lead_code}</span>}
        </span>
      ),
    },
    { key: "step", header: wsCopy.colStep, sortKey: "step", mobile: "badge", cell: (r) => (r.order_id ? <StepBadge step={r.step} /> : <span className="text-sm text-pt-muted">{t.workshop.pending}</span>) },
    { key: "size", header: wsCopy.colSize, cell: (r) => <span className="whitespace-nowrap tabular-nums">{formatSize(r)}</span> },
    { key: "qty", header: wsCopy.colQty, sortKey: "qty", align: "end", cell: (r) => <span className="tabular-nums">{r.quantity.toLocaleString("vi-VN")}</span> },
    { key: "due", header: wsCopy.colDue, sortKey: "due", cell: (r) => <DueBadge dueDate={r.due_date} step={r.step} /> },
  ];
  if (role === "admin") {
    cols.push({ key: "assignee", header: wsCopy.colAssignee, cell: (r) => r.workshop_user_name ?? <span className="text-pt-muted">{wsCopy.unassigned}</span> });
  }
  cols.push({ key: "updated", header: wsCopy.colUpdated, sortKey: "updated", className: "hidden xl:table-cell", mobile: "hidden", cell: (r) => <span className="whitespace-nowrap text-pt-muted">{dateTime(r.updated_at)}</span> });
  if (role === "workshop") {
    cols.push({
      key: "action", header: wsCopy.colAction, className: "w-64",
      cell: (r) => (r.order_id && r.phase === "open" ? <AdvanceStepForm jobId={r.job_id} code={r.code} step={r.step} role={role} compact /> : null),
    });
  }
  return cols;
}

type Props = { rows: readonly JobListRow[]; role: AppRole; list: DataTableList; filtered: boolean };

export function JobsTable({ rows, role, list, filtered }: Props) {
  return (
    <DataTable
      caption={wsCopy.jobsCaption}
      columns={columns(role)}
      rows={rows}
      rowKey={(r) => r.job_id}
      rowHref={(r) => ROUTES.workshopJob(r.job_id)}
      rowClassName={(r) => (r.due_state === "overdue" ? "bg-pt-red-tint/60" : r.phase === "closed" ? "text-pt-muted" : "")}
      list={list}
      filtered={filtered}
      empty={{ title: role === "workshop" ? wsCopy.emptyMine : wsCopy.emptyAll, body: role === "workshop" ? wsCopy.emptyMineBody : undefined }}
    />
  );
}
