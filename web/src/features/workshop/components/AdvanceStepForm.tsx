"use client";
// One-tap "next step" (+ optional note). Admin gets a step picker (any step, incl. huy).
import { useActionState } from "react";
import { format, getDictionary } from "@/i18n";
import type { AppRole, ProductionStep } from "@/lib/types";
import { advanceStepAction } from "../server/actions";
import { IDLE } from "../lib/schemas";
import { stepOptionsFor } from "../lib/steps";
import { ActionMessage, bigButton, field } from "./ui";

const t = getDictionary();

type Props = { jobId: string; step: ProductionStep; role: AppRole; compact?: boolean };

export function AdvanceStepForm({ jobId, step, role, compact = false }: Props) {
  const [state, action, pending] = useActionState(advanceStepAction, IDLE);
  const options = stepOptionsFor(role, step);
  if (options.length === 0) return <p className="text-sm text-neutral-500">{t.workshop.stepClosed}</p>;
  const isAdmin = role === "admin";
  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="jobId" value={jobId} />
      {isAdmin ? (
        <label className="flex flex-col gap-1 text-sm">
          {t.workshop.setStep}
          <select name="to" defaultValue={options[0]} className={field}>
            {options.map((s) => <option key={s} value={s}>{t.productionStep[s]}</option>)}
          </select>
        </label>
      ) : (
        <input type="hidden" name="to" value={options[0]} />
      )}
      {!compact && (
        <details className="text-sm">
          <summary className="cursor-pointer py-2 text-amber-800">{t.workshop.addNote}</summary>
          <textarea name="note" maxLength={1000} rows={3} aria-label={t.workshop.note} className={field} />
        </details>
      )}
      <button type="submit" disabled={pending} className={bigButton}>
        {isAdmin ? t.workshop.setStep : format(t.workshop.nextStep, { step: t.productionStep[options[0]!] })}
      </button>
      <ActionMessage state={state} />
    </form>
  );
}
