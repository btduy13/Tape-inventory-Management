"use client";
// "Chuyển sang sản xuất": due date required (default today + 7, min today), optional production
// note; an admin may also pick the workshop user and sees the VAT copied from the accepted quote
// (read-only: the RPC takes VAT from the quote, never from this form). Asks for confirmation (ConfirmSubmit), then
// submits. SQL re-checks role, assignment and date.
import { useActionState } from "react";
import { ConfirmSubmit } from "@/features/portal-ui/components/ConfirmDialog";
import { ActionStatus } from "@/features/portal-ui/components/States";
import { inputClass, textareaClass } from "@/features/portal-ui/components/styles";
import { getDictionary } from "@/i18n";
import { wsCopy } from "../lib/copy";
import { IDLE } from "../lib/schemas";
import { handoffVatLabel } from "../lib/vat";
import { convertToProductionAction } from "../server/actions";
import type { WorkshopUser } from "../server/queries";
import { floorButton } from "./ui";

const t = getDictionary();

type Props = {
  leadId: string;
  defaultDue: string;
  minDue: string;
  /** Admin only: workshop users to choose from (omit for workshop users). */
  workshopUsers?: WorkshopUser[];
  currentWorkshopUserId?: string | null;
  /** Admin hand-off only: show the VAT that will be copied (omit on workshop pages: no prices). */
  showVat?: boolean;
  vatPercent?: number | null;
  disabled?: boolean;
};

export function ConvertForm({ leadId, defaultDue, minDue, workshopUsers, currentWorkshopUserId, showVat, vatPercent = null, disabled }: Props) {
  const [state, action, pending] = useActionState(convertToProductionAction, IDLE);
  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="leadId" value={leadId} />
      <p className="text-sm text-pt-muted">{t.workshop.convertHint}</p>
      <label className="flex flex-col gap-1 text-sm font-medium text-pt-text">
        {t.workshop.dueDate}
        <input type="date" name="dueDate" required min={minDue} defaultValue={defaultDue} className={inputClass} />
      </label>
      {workshopUsers && (
        <label className="flex flex-col gap-1 text-sm font-medium text-pt-text">
          {t.workshop.assignee}
          <select name="workshopUserId" defaultValue={currentWorkshopUserId ?? ""} className={inputClass}>
            <option value="">{t.workshop.unassigned}</option>
            {workshopUsers.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </label>
      )}
      {showVat && (
        <p className="flex flex-col gap-0.5 text-sm" data-testid="handoff-vat">
          <span className="font-medium text-pt-text">{handoffVatLabel(vatPercent)}</span>
          <span className="text-xs text-pt-muted">{wsCopy.vatHint}</span>
        </p>
      )}
      <label className="flex flex-col gap-1 text-sm font-medium text-pt-text">
        {t.workshop.productionNote}
        <textarea name="note" maxLength={2000} rows={3} className={textareaClass} />
      </label>
      <ConfirmSubmit
        label={t.workshop.convertTitle}
        title={t.workshop.convertConfirm}
        body={wsCopy.convertConfirmBody}
        disabled={pending || disabled}
        className={floorButton}
      />
      <ActionStatus state={state} />
    </form>
  );
}
