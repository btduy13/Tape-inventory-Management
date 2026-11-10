"use client";
// "Gộp vào nhóm khác": this group's rows join another group (two spellings of one customer), so the
// bulk create makes one customer for both (admin_customer_review_regroup, 0036). Similar names first.
import { useActionState } from "react";
import { SelectField } from "@/features/portal-ui/components/Field";
import { ActionStatus } from "@/features/portal-ui/components/States";
import { buttonClass } from "@/features/portal-ui/components/styles";
import { customersCopy as c } from "../lib/copy";
import { reviewKey } from "../lib/review";
import type { ReviewRow } from "../lib/types";
import { regroupAction, type CustomerActionState } from "../server/actions";

export type GroupOption = { key: string; label: string };

const IDLE: CustomerActionState = { status: "idle" };

export function RegroupForm({ row, groups }: { row: ReviewRow; groups: GroupOption[] }) {
  const [state, action, pending] = useActionState(regroupAction, IDLE);
  const self = reviewKey(row);
  const similar = new Set(row.similar_groups.map(reviewKey));
  const options = [
    ...groups.filter((g) => similar.has(g.key)).map((g) => ({ value: g.key, label: `${c.regroupSimilar}: ${g.label}` })),
    ...groups.filter((g) => g.key !== self && !similar.has(g.key)).map((g) => ({ value: g.key, label: `${c.regroupOther}: ${g.label}` })),
  ];
  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="source_table" value={row.source_table} />
      <input type="hidden" name="source_id" value={row.source_id} />
      <SelectField name="target" label={c.regroupLabel} options={options} placeholder="—" defaultValue={row.similar_groups.length > 0 ? options[0]?.value : ""} />
      <ActionStatus state={state} />
      <button type="submit" disabled={pending || options.length === 0} className={buttonClass("secondary", "md", "self-start")}>{c.regroupSubmit}</button>
    </form>
  );
}
