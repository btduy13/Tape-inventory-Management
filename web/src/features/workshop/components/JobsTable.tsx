"use client";
// Table view (cards on phones) with inline admin updates and page-scoped selection.
import { useState, useTransition } from "react";
import { DataTable, type Column, type DataTableList } from "@/features/portal-ui/components/DataTable";
import { StepBadge } from "@/features/portal-ui/components/StatusBadge";
import { ConfirmDialog } from "@/features/portal-ui/components/ConfirmDialog";
import { ActionStatus } from "@/features/portal-ui/components/States";
import { buttonClass, checkboxClass, inputClass } from "@/features/portal-ui/components/styles";
import { getDictionary } from "@/i18n";
import { ROUTES } from "@/lib/routes";
import type { AppRole, ProductionStep } from "@/lib/types";
import { wsCopy } from "../lib/copy";
import { formatSize } from "../lib/group";
import type { JobListRow } from "../lib/list";
import { IDLE } from "../lib/schemas";
import { FLOW_STEPS, isBackward } from "../lib/steps";
import { setTableStepsAction } from "../server/actions";
import { AdvanceStepForm } from "./AdvanceStepForm";
import { DueBadge } from "./ui";

const t = getDictionary();

const dateTime = (iso: string) =>
  new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short", timeZone: "Asia/Ho_Chi_Minh" }).format(new Date(iso));

type Target = (typeof FLOW_STEPS)[number];
type Change = { rows: JobListRow[]; to: Target; bulk?: boolean };

const stepLabel = (step: ProductionStep) => {
  if (step === "dang_san_xuat") return "Đang làm";
  if (step === "san_sang_giao") return "Chờ giao";
  return t.productionStep[step];
};

function asTarget(value: string) {
  return FLOW_STEPS.find((step) => step === value);
}

function columns(role: AppRole, stepCell: Column<JobListRow>["cell"]): Column<JobListRow>[] {
  const cols: Column<JobListRow>[] = [
    {
      // The order's name is the title; admin gets the code(s) as a small second line.
      key: "name", header: wsCopy.colName, sortKey: "name", mobile: "title",
      cell: (r) => (
        <span className="flex flex-col">
          <span className="text-base">{r.name}</span>
          {role !== "workshop" && (
            <span className="text-xs font-normal text-pt-muted">
              {r.code}{r.order_id && r.lead_code ? ` · ${r.lead_code}` : ""}
            </span>
          )}
        </span>
      ),
    },
    { key: "step", header: wsCopy.colStep, sortKey: "step", mobile: "badge", cell: stepCell },
    { key: "size", header: wsCopy.colSize, cell: (r) => <span className="whitespace-nowrap tabular-nums">{formatSize(r)}</span> },
    { key: "qty", header: wsCopy.colQty, sortKey: "qty", align: "end", cell: (r) => <span className="tabular-nums">{r.quantity?.toLocaleString("vi-VN") ?? "—"}</span> },
    { key: "due", header: wsCopy.colDue, sortKey: "due", cell: (r) => <DueBadge dueDate={r.due_date} step={r.step} /> },
  ];
  cols.push({ key: "updated", header: wsCopy.colUpdated, sortKey: "updated", className: "hidden xl:table-cell", mobile: "hidden", cell: (r) => <span className="whitespace-nowrap text-pt-muted">{dateTime(r.updated_at)}</span> });
  if (role === "workshop") {
    cols.push({
      key: "action", header: wsCopy.colAction, className: "w-64",
      cell: (r) => (r.order_id && r.phase === "open" ? <AdvanceStepForm jobId={r.job_id} code={r.name} step={r.step} role={role} compact /> : null),
    });
  }
  return cols;
}

type Props = { rows: readonly JobListRow[]; role: AppRole; list: DataTableList; filtered: boolean };

export function JobsTable({ rows, role, list, filtered }: Props) {
  const [picked, setPicked] = useState<ReadonlySet<string>>(() => new Set());
  const [target, setTarget] = useState<Target>();
  const [confirm, setConfirm] = useState<Change | null>(null);
  const [status, setStatus] = useState(IDLE);
  const [pending, start] = useTransition();
  const editable = role === "admin" ? rows.filter((row) => !!row.order_id) : [];
  const selected = editable.filter((row) => picked.has(row.job_id));
  const allSelected = editable.length > 0 && selected.length === editable.length;
  const changing = selected.filter((row) => row.step !== target);

  function toggle(id: string) {
    setPicked((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function save(change: Change) {
    setConfirm(null);
    setStatus(IDLE);
    start(async () => {
      try {
        const result = await setTableStepsAction({
          jobs: change.rows.map((row) => ({ job_id: row.job_id, from_step: row.step })),
          to: change.to,
        });
        setStatus(result);
        if (result.status === "success" && change.bulk) {
          setPicked(new Set());
          setTarget(undefined);
        }
      } catch {
        setStatus({ status: "error", message: t.common.errorGeneric });
      }
    });
  }

  const requiresConfirm = ({ rows: jobs, to }: Change) => to === "da_giao" || jobs.some((row) => isBackward(row.step, to));
  const cols = columns(role, (row) => {
    if (!row.order_id) return <span className="text-sm text-pt-muted">{t.workshop.pending}</span>;
    if (role !== "admin") return <StepBadge step={row.step} />;
    return (
      <select
        aria-label={`Công đoạn của ${row.name} (${row.code})`}
        value={row.step}
        disabled={pending}
        className={`${inputClass} min-w-32 max-w-40`}
        onChange={(e) => {
          const to = asTarget(e.target.value);
          if (!to || to === row.step) return;
          const change = { rows: [row], to };
          if (requiresConfirm(change)) setConfirm(change);
          else save(change);
        }}
      >
        {!asTarget(row.step) && <option value={row.step} disabled>{stepLabel(row.step)}</option>}
        {FLOW_STEPS.map((step) => <option key={step} value={step}>{stepLabel(step)}</option>)}
      </select>
    );
  });
  if (role === "admin") {
    cols.splice(1, 0, {
      key: "select", header: "Chọn", mobile: "badge", className: "w-12",
      cell: (row) => row.order_id && (
        <input type="checkbox" aria-label={`Chọn ${row.name} (${row.code})`} className={checkboxClass}
          checked={picked.has(row.job_id)} onChange={() => toggle(row.job_id)} disabled={pending} />
      ),
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {editable.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <label className="inline-flex min-h-11 items-center gap-2 text-sm font-medium">
            <input type="checkbox" className={checkboxClass} checked={allSelected} disabled={pending}
              onChange={() => setPicked(allSelected ? new Set() : new Set(editable.map((row) => row.job_id)))} />
            Chọn tất cả trên trang
          </label>
          {selected.length > 0 && (
            <>
              <span className="text-sm text-pt-muted">Đã chọn {selected.length} đơn</span>
              <select aria-label="Công đoạn cho các đơn đã chọn" className={`${inputClass} max-w-48`} value={target ?? ""}
                disabled={pending} onChange={(e) => setTarget(asTarget(e.target.value))}>
                <option value="" disabled>Chọn công đoạn</option>
                {FLOW_STEPS.map((step) => <option key={step} value={step}>{stepLabel(step)}</option>)}
              </select>
              <button type="button" className={buttonClass("primary")} disabled={pending || !target || changing.length === 0}
                onClick={() => target && setConfirm({ rows: changing, to: target, bulk: true })}>
                Áp dụng
              </button>
            </>
          )}
        </div>
      )}
      {pending ? <p role="status" className="text-sm text-pt-muted">{wsCopy.saving}</p> : <ActionStatus state={status} />}
      <DataTable
        caption={wsCopy.jobsCaption}
        columns={cols}
        rows={rows}
        rowKey={(r) => r.job_id}
        rowHref={(r) => ROUTES.workshopJob(r.job_id)}
        rowClassName={(r) => (r.due_state === "overdue" ? "bg-pt-red-tint/60" : r.phase === "closed" ? "text-pt-muted" : "")}
        list={list}
        filtered={filtered}
        empty={{ title: role === "workshop" ? wsCopy.emptyMine : wsCopy.emptyAll, body: role === "workshop" ? wsCopy.emptyMineBody : undefined }}
      />
      <ConfirmDialog
        open={!!confirm}
        title={confirm ? `Chuyển ${confirm.rows.length} đơn sang “${stepLabel(confirm.to)}”?` : ""}
        tone={confirm && requiresConfirm(confirm) ? "danger" : "primary"}
        confirmLabel="Đổi công đoạn"
        onCancel={() => setConfirm(null)}
        onConfirm={() => { if (confirm) save(confirm); }}
      />
    </div>
  );
}
