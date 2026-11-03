"use client";
// Admin: assign / unassign the workshop user. Lead page: by lead (assign_production_job, may
// create the job). Job page: by job id (assign_workshop_job, 0024: also lead-less jobs).
import { useActionState } from "react";
import { ActionStatus } from "@/features/portal-ui/components/States";
import { buttonClass, inputClass } from "@/features/portal-ui/components/styles";
import { getDictionary } from "@/i18n";
import { assignJobAction, assignWorkshopAction } from "../server/actions";
import { IDLE } from "../lib/schemas";
import type { WorkshopUser } from "../server/queries";

const t = getDictionary();

type Target = { leadId: string; jobId?: never } | { jobId: string; leadId?: never };
type Props = Target & { users: WorkshopUser[]; currentUserId: string | null };

export function AssignWorkshopForm({ leadId, jobId, users, currentUserId }: Props) {
  const [state, action, pending] = useActionState(jobId ? assignJobAction : assignWorkshopAction, IDLE);
  return (
    <form action={action} className="flex flex-col gap-2">
      {jobId ? <input type="hidden" name="jobId" value={jobId} /> : <input type="hidden" name="leadId" value={leadId} />}
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
