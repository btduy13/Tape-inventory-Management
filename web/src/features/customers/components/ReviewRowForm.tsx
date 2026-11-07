"use client";
// Decision on one review-queue row: link to a suggested / found customer, create a new one from the
// order's contact, or skip. The row leaves the list after a successful decision (revalidated).
import { useActionState } from "react";
import { SelectField } from "@/features/portal-ui/components/Field";
import { ActionStatus } from "@/features/portal-ui/components/States";
import { buttonClass } from "@/features/portal-ui/components/styles";
import { customersCopy as c } from "../lib/copy";
import type { ReviewRow, Suggestion } from "../lib/types";
import { resolveReviewAction, type CustomerActionState } from "../server/actions";

const IDLE: CustomerActionState = { status: "idle" };
const label = (s: Suggestion) => [s.name, s.phone, s.company].filter(Boolean).join(" · ");

export function ReviewRowForm({ row, found }: { row: ReviewRow; found: Suggestion[] }) {
  const [state, action, pending] = useActionState(resolveReviewAction, IDLE);
  const suggested = new Set(row.suggestions.map((s) => s.id));
  const options = [
    ...row.suggestions.map((s) => ({ value: s.id, label: `${c.reviewSuggested}: ${label(s)}` })),
    ...found.filter((s) => !suggested.has(s.id)).map((s) => ({ value: s.id, label: `${c.reviewFound}: ${label(s)}` })),
  ];
  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="source_table" value={row.source_table} />
      <input type="hidden" name="source_id" value={row.source_id} />
      <input type="hidden" name="name" value={row.ten_khach_hang ?? ""} />
      <input type="hidden" name="phone" value={row.sdt_khach_hang ?? ""} />
      <input type="hidden" name="address" value={row.dia_chi_khach_hang ?? ""} />
      <SelectField name="customer_id" label={c.reviewPick} options={options} placeholder="—" defaultValue={row.suggestions[0]?.id ?? ""} />
      <ActionStatus state={state} />
      <div className="flex flex-wrap gap-2">
        <button type="submit" name="intent" value="link" disabled={pending} className={buttonClass("primary")}>{c.reviewLink}</button>
        <button type="submit" name="intent" value="create" disabled={pending || !row.ten_khach_hang} className={buttonClass("secondary")}>{c.reviewCreate}</button>
        <button type="submit" name="intent" value="skip" disabled={pending} className={buttonClass("ghost")}>{c.reviewSkip}</button>
      </div>
    </form>
  );
}
