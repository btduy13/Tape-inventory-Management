"use client";
// One tap on the big button opens a confirmation (optional note inside), confirm = advance.
// Workshop: one "Chuyển sang <next>" button, never back, never Đã giao; at Sẵn sàng giao the
// button becomes "Tạo phiếu giao hàng" (the delivery note QR finishes the job).
// Admin: step picker (any step incl. huy; huy and moving back confirm in red).
// The SQL function advance_production_step() is the real check.
import Link from "next/link";
import { useActionState, useState } from "react";
import { ConfirmDialog } from "@/features/portal-ui/components/ConfirmDialog";
import { ActionStatus } from "@/features/portal-ui/components/States";
import { buttonClass, inputClass, textareaClass } from "@/features/portal-ui/components/styles";
import { format, getDictionary } from "@/i18n";
import { ROUTES } from "@/lib/routes";
import type { AppRole, ProductionStep } from "@/lib/types";
import { wsCopy } from "../lib/copy";
import { IDLE } from "../lib/schemas";
import { isBackward, needsDeliveryNote, stepOptionsFor } from "../lib/steps";
import { advanceStepAction } from "../server/actions";
import { floorButton, floorButtonGo } from "./ui";

const t = getDictionary();

type Props = { jobId: string; code: string; step: ProductionStep; role: AppRole; compact?: boolean };

/** Link to the printable delivery note page (it creates the note on a button press there). */
export function DeliveryNoteLink({ jobId, admin = false }: { jobId: string; admin?: boolean }) {
  return (
    <Link href={ROUTES.workshopDeliveryNote(jobId)} className={admin ? buttonClass("secondary") : floorButtonGo}>
      {wsCopy.noteCreate}
    </Link>
  );
}

export function AdvanceStepForm({ jobId, code, step, role, compact = false }: Props) {
  const [state, action, pending] = useActionState(advanceStepAction, IDLE);
  const options = stepOptionsFor(role, step);
  const [to, setTo] = useState<ProductionStep | undefined>(options[0]);
  const [open, setOpen] = useState(false);
  const isAdmin = role === "admin";
  const atDelivery = needsDeliveryNote(step) && (isAdmin || role === "workshop");

  // Workshop at Sẵn sàng giao: nothing to advance, only the delivery note.
  if (!isAdmin && atDelivery) return <DeliveryNoteLink jobId={jobId} />;
  if (options.length === 0 || !to) return <p className="text-sm text-pt-muted">{t.workshop.stepClosed}</p>;

  const target = options.includes(to) ? to : options[0]!;
  const cancel = target === "huy";
  const back = isAdmin && isBackward(step, target);
  const danger = cancel || back;
  const targetLabel = t.productionStep[target];
  const title = cancel
    ? format(wsCopy.cancelTitle, { code })
    : back
      ? format(wsCopy.backTitle, { code, step: targetLabel })
      : format(isAdmin ? wsCopy.setStepTitle : wsCopy.advanceTitle, { code, step: targetLabel });
  const lead = cancel
    ? wsCopy.cancelBody
    : back
      ? format(wsCopy.backBody, { from: t.productionStep[step] })
      : format(wsCopy.advanceBody, { from: t.productionStep[step] });
  const confirmLabel = cancel
    ? wsCopy.cancelConfirm
    : back
      ? format(wsCopy.backConfirm, { step: targetLabel })
      : isAdmin ? t.workshop.setStep : format(wsCopy.advanceTo, { step: targetLabel });
  const body = (
    <div className="flex flex-col gap-3">
      <p>{lead}</p>
      {!isAdmin && <p className="font-semibold text-pt-text">{wsCopy.advanceNoBack}</p>}
      <label className="flex flex-col gap-1 text-sm font-medium text-pt-text">
        {wsCopy.noteOptional}
        <textarea name="note" maxLength={1000} rows={compact ? 2 : 3} className={textareaClass} />
      </label>
    </div>
  );

  return (
    <div className="pt-row-raise flex flex-col gap-2">
      <form action={action} className="flex flex-col gap-2">
        <input type="hidden" name="jobId" value={jobId} />
        {isAdmin ? (
          <label className="flex flex-col gap-1 text-sm font-medium text-pt-text">
            {t.workshop.setStep}
            <select name="to" value={target} onChange={(e) => setTo(e.target.value as ProductionStep)} className={inputClass}>
              {options.map((s) => <option key={s} value={s}>{t.productionStep[s]}</option>)}
            </select>
          </label>
        ) : (
          <input type="hidden" name="to" value={target} />
        )}
        <button type="button" disabled={pending} onClick={() => setOpen(true)} className={floorButton}>
          {pending ? wsCopy.saving : isAdmin ? t.workshop.setStep : format(wsCopy.advanceTo, { step: targetLabel })}
        </button>
        <ConfirmDialog
          open={open}
          title={title}
          body={body}
          tone={danger ? "danger" : "primary"}
          confirmLabel={confirmLabel}
          onCancel={() => setOpen(false)}
          confirmSubmit={{}}
        />
        <ActionStatus state={state} />
      </form>
      {atDelivery && <DeliveryNoteLink jobId={jobId} admin />}
    </div>
  );
}
