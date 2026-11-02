"use client";
// Status change. `options` comes from nextStatusOptions(role, status) on the server; the action
// and the DB re-check the transition. The suggested next step is preselected; cancelling asks
// for confirmation first.
import { useActionState, useState } from "react";
import { format, getDictionary } from "@/i18n";
import type { LeadStatus } from "@/lib/types";
import { ActionStatus } from "@/features/portal-ui/components/States";
import { ConfirmSubmit } from "@/features/portal-ui/components/ConfirmDialog";
import { buttonClass, inputClass, textareaClass } from "@/features/portal-ui/components/styles";
import { changeStatusAction } from "../server/actions";
import { IDLE } from "../lib/action-state";
import { orderStatusOptions, recommendedNext } from "../lib/next-step";

const t = getDictionary();
const c = t.leadsUi;

type Props = { leadId: string; code: string; status: LeadStatus; options: LeadStatus[] };

export function StatusForm({ leadId, code, status, options }: Props) {
  const [state, action, pending] = useActionState(changeStatusAction, IDLE);
  const suggested = recommendedNext(status, options);
  const [to, setTo] = useState<string>(suggested ?? "");
  if (options.length === 0) {
    return <p className="text-sm text-pt-muted">{c.noStatusOptions}</p>;
  }
  const label = to ? format(c.moveTo, { status: t.leadStatus[to as LeadStatus] }) : c.goStatus;
  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="leadId" value={leadId} />
      <label className="flex flex-col gap-1.5 text-sm font-medium text-pt-text">
        {t.orders.changeStatus}
        <select name="to" required value={to} onChange={(e) => setTo(e.target.value)} className={inputClass}>
          <option value="" disabled>{t.orders.selectStatus}</option>
          {orderStatusOptions(options).map((s) => (
            <option key={s} value={s}>
              {t.leadStatus[s]}
              {s === suggested ? ` (${c.nextTo.toLowerCase()})` : ""}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-pt-text">
        {t.orders.statusNote}
        <textarea name="note" maxLength={1000} rows={2} className={textareaClass} aria-describedby={`${leadId}-status-hint`} />
        <span id={`${leadId}-status-hint`} className="text-xs font-normal text-pt-muted">{c.statusNoteHint}</span>
      </label>
      <ActionStatus state={state} />
      {to === "cancelled" ? (
        <ConfirmSubmit
          label={c.cancelLead}
          title={format(c.cancelTitle, { code })}
          body={c.cancelBody}
          tone="danger"
          disabled={pending}
        />
      ) : (
        <button type="submit" disabled={pending || !to} className={buttonClass("primary")}>{label}</button>
      )}
    </form>
  );
}
