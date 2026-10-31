"use client";
import { useActionState } from "react";
import { getDictionary } from "@/i18n";
import { assignLeadAction } from "../server/actions";
import { IDLE, type AssignActionState } from "../lib/schemas";
import type { Assignee } from "../server/queries";

const t = getDictionary();

const TONE: Record<AssignActionState["status"], string> = {
  idle: "",
  success: "text-green-700",
  warning: "text-amber-700",
  error: "text-red-700",
};

type Props = { leadId: string; currentAssigneeId: string | null; assignees: Assignee[] };

/** Admin-only panel. The Server Action re-checks the role; assign_lead re-checks in SQL. */
export function AssignForm({ leadId, currentAssigneeId, assignees }: Props) {
  const [state, action, pending] = useActionState(assignLeadAction, IDLE);
  return (
    <section className="flex flex-col gap-3 rounded-lg border border-neutral-200 p-4">
      <h2 className="font-semibold">{t.assignment.assign}</h2>
      <form action={action} className="flex flex-col gap-2">
        <input type="hidden" name="leadId" value={leadId} />
        <label className="flex flex-col gap-1 text-sm">
          {t.assignment.assignTo}
          <select
            name="userId"
            required
            defaultValue={currentAssigneeId ?? ""}
            key={currentAssigneeId ?? "none"}
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
          >
            <option value="" disabled>{t.assignment.selectUser}</option>
            {assignees.map((a) => (
              <option key={a.id} value={a.id}>
                {(a.full_name || a.email) ?? a.id} · {t.roles[a.role]}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" disabled={pending} className="self-start rounded-md bg-amber-700 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-800 disabled:opacity-60">
          {t.assignment.assign}
        </button>
      </form>
      {currentAssigneeId && (
        <form action={action}>
          <input type="hidden" name="leadId" value={leadId} />
          <input type="hidden" name="userId" value="" />
          <button type="submit" disabled={pending} className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm text-neutral-700 hover:bg-neutral-100 disabled:opacity-60">
            {t.assignment.unassign}
          </button>
        </form>
      )}
      {state.message && (
        <p role={state.status === "error" ? "alert" : "status"} className={`text-sm ${TONE[state.status]}`}>{state.message}</p>
      )}
    </section>
  );
}
