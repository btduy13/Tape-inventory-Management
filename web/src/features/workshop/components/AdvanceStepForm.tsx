"use client";
// One tap on the big button opens a confirmation (optional note inside), confirm = advance.
// Workshop: next step only. Admin: step picker (any step incl. huy; huy confirms in red).
// The SQL function advance_production_step() is the real check.
import { useActionState, useState } from "react";
import { ConfirmDialog } from "@/features/portal-ui/components/ConfirmDialog";
import { ActionStatus } from "@/features/portal-ui/components/States";
import { inputClass, textareaClass } from "@/features/portal-ui/components/styles";
import { format, getDictionary } from "@/i18n";
import type { AppRole, ProductionStep } from "@/lib/types";
import { wsCopy } from "../lib/copy";
import { IDLE } from "../lib/schemas";
import { stepOptionsFor } from "../lib/steps";
import { advanceStepAction } from "../server/actions";
import { floorButton } from "./ui";

const t = getDictionary();

type Props = { jobId: string; code: string; step: ProductionStep; role: AppRole; compact?: boolean };

export function AdvanceStepForm({ jobId, code, step, role, compact = false }: Props) {
  const [state, action, pending] = useActionState(advanceStepAction, IDLE);
  const options = stepOptionsFor(role, step);
  const [to, setTo] = useState<ProductionStep | undefined>(options[0]);
  const [open, setOpen] = useState(false);
  if (options.length === 0 || !to) return <p className="text-sm text-pt-muted">{t.workshop.stepClosed}</p>;

  const isAdmin = role === "admin";
  const target = options.includes(to) ? to : options[0]!;
  const danger = target === "huy";
  const title = danger
    ? format(wsCopy.cancelTitle, { code })
    : format(isAdmin ? wsCopy.setStepTitle : wsCopy.advanceTitle, { code, step: t.productionStep[target] });
  const body = (
    <div className="flex flex-col gap-3">
      <p>{danger ? wsCopy.cancelBody : format(wsCopy.advanceBody, { from: t.productionStep[step] })}</p>
      <label className="flex flex-col gap-1 text-sm font-medium text-pt-text">
        {wsCopy.noteOptional}
        <textarea name="note" maxLength={1000} rows={compact ? 2 : 3} className={textareaClass} />
      </label>
    </div>
  );

  return (
    <form action={action} className="pt-row-raise flex flex-col gap-2">
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
        {pending ? wsCopy.saving : isAdmin ? t.workshop.setStep : format(wsCopy.advanceTo, { step: t.productionStep[target] })}
      </button>
      <ConfirmDialog
        open={open}
        title={title}
        body={body}
        tone={danger ? "danger" : "primary"}
        confirmLabel={danger ? wsCopy.cancelConfirm : isAdmin ? t.workshop.setStep : format(wsCopy.advanceTo, { step: t.productionStep[target] })}
        onCancel={() => setOpen(false)}
        confirmSubmit={{}}
      />
      <ActionStatus state={state} />
    </form>
  );
}
