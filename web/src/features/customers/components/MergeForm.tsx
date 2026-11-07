"use client";
// Merge duplicates into the open customer: tick candidates (found by the page's ?q= search), confirm.
import { useActionState } from "react";
import { ConfirmSubmit } from "@/features/portal-ui/components/ConfirmDialog";
import { CheckboxField } from "@/features/portal-ui/components/Field";
import { ActionStatus } from "@/features/portal-ui/components/States";
import { customersCopy as c } from "../lib/copy";
import type { Customer } from "../lib/types";
import { mergeCustomersAction, type CustomerActionState } from "../server/actions";

const IDLE: CustomerActionState = { status: "idle" };

export function MergeForm({ target, candidates }: { target: string; candidates: Customer[] }) {
  const [state, action, pending] = useActionState(mergeCustomersAction, IDLE);
  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="target" value={target} />
      {candidates.length === 0 ? <p className="text-sm text-pt-muted">{c.mergeNone}</p> : (
        <ul className="flex flex-col">
          {candidates.map((m) => (
            <li key={m.id}>
              <CheckboxField name="source" value={m.id} label={[m.name, m.phone, m.company, m.address].filter(Boolean).join(" · ")} />
            </li>
          ))}
        </ul>
      )}
      <ActionStatus state={state} />
      {candidates.length > 0 && (
        <div>
          <ConfirmSubmit label={c.mergeSubmit} title={c.mergeConfirm} body={c.mergeConfirmBody} tone="danger" disabled={pending} />
        </div>
      )}
    </form>
  );
}
