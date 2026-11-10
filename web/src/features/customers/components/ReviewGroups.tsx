"use client";
// Bulk part of /admin/khach-hang/gop: one checkbox per name group, "Chọn tất cả", one confirmed
// "Tạo khách cho X nhóm" (admin_customer_review_bulk_create, 0036) and the batch's undo button.
// Checkboxes sit in each group card and join the top form through the `form` attribute.
import { useActionState, useState } from "react";
import { format } from "@/i18n";
import { ConfirmSubmit } from "@/features/portal-ui/components/ConfirmDialog";
import { ActionStatus, EmptyState } from "@/features/portal-ui/components/States";
import { buttonClass, checkboxClass, surfaceClass } from "@/features/portal-ui/components/styles";
import { customersCopy as c } from "../lib/copy";
import { canBulkCreate, groupName, reviewKey } from "../lib/review";
import type { ReviewRow, Suggestion } from "../lib/types";
import { bulkCreateAction, undoBatchAction, type BulkActionState, type CustomerActionState } from "../server/actions";
import { ReviewGroupItem } from "./ReviewGroupItem";

const FORM_ID = "bulk-review";
const IDLE: BulkActionState = { status: "idle" };

function UndoBatch({ batchId }: { batchId: string }) {
  const [state, action, pending] = useActionState(undoBatchAction, IDLE as CustomerActionState);
  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="batch_id" value={batchId} />
      {state.status !== "ok" && (
        <ConfirmSubmit label={c.undo} title={c.undoConfirmTitle} body={c.undoConfirmBody} tone="danger" disabled={pending} className={buttonClass("secondary", "md", "self-start")} />
      )}
      <ActionStatus state={state} />
    </form>
  );
}

export function ReviewGroups({ rows, found }: { rows: ReviewRow[]; found: Suggestion[] }) {
  const [picked, setPicked] = useState<ReadonlySet<string>>(new Set());
  const [state, action, pending] = useActionState(bulkCreateAction, IDLE);
  const selectable = rows.filter(canBulkCreate).map(reviewKey);
  const live = selectable.filter((k) => picked.has(k));
  const liveRows = rows.filter((r) => picked.has(reviewKey(r))).reduce((n, r) => n + r.group_size, 0);
  const all = selectable.length > 0 && live.length === selectable.length;
  const groups = rows.map((r) => ({ key: reviewKey(r), label: `${groupName(r)} (${r.group_size})` }));

  const toggle = (key: string, on: boolean) =>
    setPicked((prev) => {
      const next = new Set(prev);
      if (on) next.add(key);
      else next.delete(key);
      return next;
    });

  return (
    <div className="flex flex-col gap-3">
      {rows.length > 0 && <form id={FORM_ID} action={action} className={`${surfaceClass} flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between`}>
        <label className="flex min-h-11 items-center gap-3 text-sm font-medium">
          <input type="checkbox" className={checkboxClass} checked={all} disabled={selectable.length === 0}
            onChange={(e) => setPicked(e.target.checked ? new Set(selectable) : new Set())} />
          {all ? c.selectNone : c.selectAll} ({selectable.length})
        </label>
        <ConfirmSubmit
          label={format(c.bulkButton, { n: live.length })}
          title={format(c.bulkConfirmTitle, { n: live.length })}
          body={format(c.bulkConfirmBody, { rows: liveRows })}
          disabled={pending || live.length === 0}
        />
      </form>}
      {state.status !== "idle" && (
        <div className="flex flex-col gap-2">
          <ActionStatus state={state} />
          {state.batchId && <UndoBatch key={state.batchId} batchId={state.batchId} />}
        </div>
      )}
      {rows.length === 0 ? <EmptyState title={c.reviewEmpty} /> : (
        <>
          <div aria-hidden className="hidden px-4 text-xs font-medium text-pt-muted lg:grid lg:grid-cols-[2.75rem_minmax(0,1fr)_6rem_9rem_10rem] lg:gap-4">
            <span />
            <span>{c.colGroup}</span>
            <span className="text-end">{c.colCount}</span>
            <span className="text-end">{c.colSum}</span>
            <span>{c.colLatest}</span>
          </div>
          <ul aria-label={c.reviewCaption} className="flex flex-col gap-3">
            {rows.map((r) => (
              <ReviewGroupItem key={reviewKey(r)} row={r} found={found} groups={groups} formId={FORM_ID}
                checked={picked.has(reviewKey(r))} onCheck={(on) => toggle(reviewKey(r), on)} />
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
