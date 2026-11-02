"use client";
import { useActionState } from "react";
import { format, getDictionary } from "@/i18n";
import { ConfirmSubmit } from "@/features/portal-ui/components/ConfirmDialog";
import { InlineStatus, type InlineTone } from "@/features/portal-ui/components/States";
import { Section } from "@/features/portal-ui/components/Section";
import { buttonClass, inputClass } from "@/features/portal-ui/components/styles";
import { assignLeadAction } from "../server/actions";
import { IDLE, type AssignActionState } from "../lib/schemas";
import type { Assignee } from "../server/queries";

const t = getDictionary();
const c = t.leadsUi;

const TONE: Record<Exclude<AssignActionState["status"], "idle">, InlineTone> = {
  success: "success",
  warning: "info",
  error: "error",
};

type Props = { leadId: string; code: string; currentAssigneeId: string | null; assignees: Assignee[] };

/** Section id used by the lead header's "Phân công" button (orders lib/next-step PANEL.assign). */
const ASSIGN_PANEL_ID = "phan-cong";

/** Admin-only panel. The Server Action re-checks the role; assign_lead re-checks in SQL. */
export function AssignForm({ leadId, code, currentAssigneeId, assignees }: Props) {
  const [state, action, pending] = useActionState(assignLeadAction, IDLE);
  const current = assignees.find((a) => a.id === currentAssigneeId);
  return (
    <Section id={ASSIGN_PANEL_ID} title={c.panelAssign}>
      <p className="text-sm">
        <span className="text-pt-muted">{c.currentAssignee}: </span>
        {currentAssigneeId ? (
          <span className="font-semibold text-pt-text">{current ? current.full_name || current.email : "—"}</span>
        ) : (
          <span className="font-semibold text-pt-red-ink">{t.assignment.unassigned}</span>
        )}
      </p>
      <form action={action} className="flex flex-col gap-3">
        <input type="hidden" name="leadId" value={leadId} />
        <label className="flex flex-col gap-1.5 text-sm font-medium text-pt-text">
          {t.assignment.assignTo}
          <select name="userId" required defaultValue={currentAssigneeId ?? ""} key={currentAssigneeId ?? "none"} className={inputClass}>
            <option value="" disabled>{t.assignment.selectUser}</option>
            {assignees.map((a) => (
              <option key={a.id} value={a.id}>
                {(a.full_name || a.email) ?? a.id} ({t.roles[a.role]})
              </option>
            ))}
          </select>
        </label>
        <button type="submit" disabled={pending} className={buttonClass("primary")}>{t.assignment.assign}</button>
      </form>
      {currentAssigneeId && (
        <form action={action}>
          <input type="hidden" name="leadId" value={leadId} />
          <input type="hidden" name="userId" value="" />
          <ConfirmSubmit
            label={t.assignment.unassign}
            title={format(c.unassignTitle, { code })}
            body={c.unassignBody}
            tone="danger"
            disabled={pending}
            className={buttonClass("ghost", "md", "w-full text-pt-red-ink")}
          />
        </form>
      )}
      {state.status !== "idle" && state.message && <InlineStatus tone={TONE[state.status]}>{state.message}</InlineStatus>}
    </Section>
  );
}
