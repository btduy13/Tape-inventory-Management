"use client";
// Admin: assign / unassign the workshop user of a lead's production job.
import { useActionState } from "react";
import { ActionStatus } from "@/features/portal-ui/components/States";
import { buttonClass, inputClass } from "@/features/portal-ui/components/styles";
import { getDictionary } from "@/i18n";
import { assignWorkshopAction } from "../server/actions";
import { IDLE } from "../lib/schemas";
import type { WorkshopUser } from "../server/queries";

const t = getDictionary();

type Props = { leadId: string; users: WorkshopUser[]; currentUserId: string | null };

export function AssignWorkshopForm({ leadId, users, currentUserId }: Props) {
  const [state, action, pending] = useActionState(assignWorkshopAction, IDLE);
  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="leadId" value={leadId} />
      <label className="flex flex-col gap-1 text-sm font-medium text-pt-text">
        {t.workshop.assignee}
        <select name="userId" defaultValue={currentUserId ?? ""} className={inputClass}>
          <option value="">{t.workshop.unassigned}</option>
          {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
      </label>
      <button type="submit" disabled={pending} className={buttonClass("secondary")}>{t.workshop.assign}</button>
      <ActionStatus state={state} />
    </form>
  );
}
