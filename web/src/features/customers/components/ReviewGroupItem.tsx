"use client";
// One name group of the review queue: checkbox (joins the bulk form), name / count / total / latest,
// and a native <details> with the group's orders, "Gộp vào nhóm khác" and the one-group decision.
import { format } from "@/i18n";
import { ToneBadge } from "@/features/portal-ui/components/StatusBadge";
import { checkboxClass, surfaceClass } from "@/features/portal-ui/components/styles";
import { dateTimeVn, money } from "@/features/admin-orders/lib/format";
import { TYPE_LABEL, customersCopy as c } from "../lib/copy";
import { canBulkCreate, groupName, groupTotal, hasName, spellings } from "../lib/review";
import type { ReviewRow, Suggestion } from "../lib/types";
import { RegroupForm, type GroupOption } from "./RegroupForm";
import { ReviewRowForm } from "./ReviewRowForm";

type Props = {
  row: ReviewRow;
  found: Suggestion[];
  groups: GroupOption[];
  formId: string;
  checked: boolean;
  onCheck: (on: boolean) => void;
};

const label = "text-pt-muted lg:hidden";

export function ReviewGroupItem({ row: r, found, groups, formId, checked, onCheck }: Props) {
  const name = groupName(r);
  const names = spellings(r);
  const named = hasName(r);
  return (
    <li className={`${surfaceClass} flex flex-col gap-2 p-3 sm:p-4`}>
      <div className="grid grid-cols-[2.75rem_minmax(0,1fr)] gap-x-2 gap-y-1 text-sm lg:grid-cols-[2.75rem_minmax(0,1fr)_6rem_9rem_10rem] lg:items-center lg:gap-x-4">
        <label className="row-span-4 flex size-11 items-center justify-center lg:row-span-1">
          <input type="checkbox" form={formId} name="row" value={`${r.source_table}:${r.source_id}`} className={checkboxClass}
            checked={checked} disabled={!canBulkCreate(r)} onChange={(e) => onCheck(e.target.checked)}
            aria-label={format(c.pickGroup, { name })} />
        </label>
        <div className="flex min-w-0 flex-col gap-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="break-words font-semibold">{named ? name : c.noName}</span>
            {names.length > 1 && <ToneBadge tone="amber">{format(c.spellings, { n: names.length })}</ToneBadge>}
          </span>
          {r.similar_groups.length > 0 && (
            <span className="break-words text-xs text-pt-muted">
              {c.similar}: {r.similar_groups.map((g) => `${g.ten_khach_hang ?? g.source_id} (${g.group_size})`).join(", ")}
            </span>
          )}
        </div>
        <span className="tabular-nums lg:text-end"><span className={label}>{c.colCount}: </span>{r.group_size}</span>
        <span className="tabular-nums lg:text-end"><span className={label}>{c.colSum}: </span>{money(groupTotal(r))}</span>
        <span className="text-pt-muted"><span className="lg:hidden">{c.colLatest}: </span>{dateTimeVn(r.thoi_gian)}</span>
      </div>
      <details className="group lg:ms-[3.25rem]">
        <summary className="flex min-h-11 cursor-pointer items-center text-sm font-medium text-vt-blue">{c.details}</summary>
        <div className="flex flex-col gap-4 pt-2">
          <ul className="flex flex-col divide-y divide-pt-line rounded-lg border border-pt-line text-sm">
            {r.members.map((m) => (
              <li key={`${m.source_table}:${m.source_id}`} className="grid grid-cols-2 gap-x-3 gap-y-1 px-3 py-2 sm:grid-cols-[10rem_9rem_minmax(0,1fr)_8rem]">
                <span className="flex flex-col">
                  <span className="font-medium">{m.source_id}</span>
                  <span className="text-xs text-pt-muted">{TYPE_LABEL[m.order_type] ?? m.order_type}</span>
                </span>
                <span className="text-pt-muted">{dateTimeVn(m.thoi_gian)}</span>
                <span className="break-words">{[m.ten_khach_hang, m.sdt_khach_hang].filter(Boolean).join(" · ") || "—"}</span>
                <span className="tabular-nums sm:text-end">{m.tong_tien == null ? "—" : money(m.tong_tien)}</span>
              </li>
            ))}
          </ul>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <RegroupForm row={r} groups={groups} />
            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium">{c.existingTitle}</p>
              <ReviewRowForm row={r} found={found} />
            </div>
          </div>
        </div>
      </details>
    </li>
  );
}
