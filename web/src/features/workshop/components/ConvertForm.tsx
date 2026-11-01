"use client";
// "Chuyển sang sản xuất": due date required (default today + 7, min today), optional production
// note; an admin may also pick the workshop user. SQL re-checks role, assignment and date.
import { useActionState } from "react";
import { getDictionary } from "@/i18n";
import { convertToProductionAction } from "../server/actions";
import { IDLE } from "../lib/schemas";
import type { WorkshopUser } from "../server/queries";
import { ActionMessage, bigButton, field } from "./ui";

const t = getDictionary();

type Props = {
  leadId: string;
  defaultDue: string;
  minDue: string;
  /** Admin only: workshop users to choose from (omit for workshop users). */
  workshopUsers?: WorkshopUser[];
  currentWorkshopUserId?: string | null;
  disabled?: boolean;
};

export function ConvertForm({ leadId, defaultDue, minDue, workshopUsers, currentWorkshopUserId, disabled }: Props) {
  const [state, action, pending] = useActionState(convertToProductionAction, IDLE);
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!window.confirm(t.workshop.convertConfirm)) e.preventDefault();
      }}
      className="flex flex-col gap-3"
    >
      <input type="hidden" name="leadId" value={leadId} />
      <p className="text-sm text-neutral-600">{t.workshop.convertHint}</p>
      <label className="flex flex-col gap-1 text-sm font-medium">
        {t.workshop.dueDate}
        <input type="date" name="dueDate" required min={minDue} defaultValue={defaultDue} className={field} />
      </label>
      {workshopUsers && (
        <label className="flex flex-col gap-1 text-sm font-medium">
          {t.workshop.assignee}
          <select name="workshopUserId" defaultValue={currentWorkshopUserId ?? ""} className={field}>
            <option value="">{t.workshop.unassigned}</option>
            {workshopUsers.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </label>
      )}
      <label className="flex flex-col gap-1 text-sm font-medium">
        {t.workshop.productionNote}
        <textarea name="note" maxLength={2000} rows={3} className={field} />
      </label>
      <button type="submit" disabled={pending || disabled} className={bigButton}>{t.workshop.convertTitle}</button>
      <ActionMessage state={state} />
    </form>
  );
}
