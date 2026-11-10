"use client";
// Status of one list row as icons that can be changed in place (like the workshop table):
// workshop step select (printed tape with a job, admin), Đã giao (truck) and Đã tất toán (cash).
// Green = done, red = not yet. Undoing, "Đã giao" and backward steps ask first; the RPCs re-check.
import { useState, useTransition } from "react";
import { format, getDictionary } from "@/i18n";
import { ConfirmDialog } from "@/features/portal-ui/components/ConfirmDialog";
import { Icon } from "@/features/portal-ui/components/Icon";
import { IconButton } from "@/features/portal-ui/components/IconButton";
import { ToneBadge } from "@/features/portal-ui/components/StatusBadge";
import type { ToastMessage } from "@/features/portal-ui/components/Toast";
import { inputClass } from "@/features/portal-ui/components/styles";
import { FLOW_STEPS, isBackward } from "@/features/workshop/lib/steps";
import { setTableStepsAction } from "@/features/workshop/server/actions";
import type { ProductionStep } from "@/lib/types";
import { ordersCopy as c } from "../lib/copy";
import { listCopy as l } from "../lib/list-copy";
import type { ListPerms } from "../lib/perms";
import type { AdminOrderRow } from "../lib/types";
import { setStatusAction } from "../server/actions";

const t = getDictionary();
type Step = (typeof FLOW_STEPS)[number];
const asStep = (v: string) => FLOW_STEPS.find((s) => s === v);

export type QuickChange =
  | { kind: "giao" | "tatToan"; order: AdminOrderRow; to: boolean }
  | { kind: "step"; order: AdminOrderRow; to: Step };

/** Asks first when the change is hard to undo by accident. */
const needsConfirm = (ch: QuickChange) =>
  ch.kind === "step" ? ch.to === "da_giao" || (!!ch.order.step && isBackward(ch.order.step, ch.to)) : !ch.to || ch.kind === "giao";

function confirmTitle(ch: QuickChange): string {
  const id = ch.order.id;
  if (ch.kind === "step") return format(l.quickConfirmStep, { id, label: t.productionStep[ch.to] });
  if (ch.kind === "giao" && ch.to) return format(l.quickConfirmGiao, { id });
  return format(l.quickConfirmUndo, { id, label: ch.kind === "giao" ? c.notDelivered : c.notSettled });
}

/** One instance per table: runs a change (after the confirm when needed) and reports a toast. */
export function useQuickStatus(onResult: (t: ToastMessage) => void, after: () => void) {
  const [confirm, setConfirm] = useState<QuickChange | null>(null);
  const [busy, start] = useTransition();

  const run = (ch: QuickChange) => {
    setConfirm(null);
    start(async () => {
      const r = ch.kind === "step"
        ? await setTableStepsAction({ jobs: [{ job_id: ch.order.job_id, from_step: ch.order.step }], to: ch.to })
        : await setStatusAction([{ type: ch.order.type, id: ch.order.id }], {
          da_giao: ch.kind === "giao" ? ch.to : null, da_tat_toan: ch.kind === "tatToan" ? ch.to : null,
        });
      onResult({ id: Date.now(), message: r.message ?? "", tone: r.status === "error" ? "error" : "success" });
      after();
    });
  };
  const change = (ch: QuickChange) => (needsConfirm(ch) ? setConfirm(ch) : run(ch));

  const dialog = (
    <ConfirmDialog
      open={!!confirm}
      title={confirm ? confirmTitle(confirm) : ""}
      body={confirm?.kind === "giao" && confirm.to && confirm.order.job_id ? l.quickConfirmGiaoBody : undefined}
      tone={confirm && !(confirm.kind === "giao" && confirm.to) ? "danger" : "primary"}
      confirmLabel={l.quickSave}
      onCancel={() => setConfirm(null)}
      onConfirm={() => confirm && run(confirm)}
    />
  );
  return { change, busy, dialog };
}

export function QuickStatus({ o, perms, busy, onChange }: { o: AdminOrderRow; perms: ListPerms; busy: boolean; onChange: (ch: QuickChange) => void }) {
  if (o.is_quote) return <ToneBadge tone="yellow">{c.quoteBadge}</ToneBadge>;
  const canStep = perms.steps && o.type === "bang_keo_in" && !!o.job_id && !!o.step && o.step !== "huy";
  return (
    <span className="flex items-center gap-1.5">
      {canStep && (
        <select
          aria-label={format(l.quickStepOf, { id: o.id })} value={o.step ?? ""} disabled={busy}
          className={`${inputClass} min-h-9! w-36 py-1 text-sm ${o.step === "da_giao" ? "text-pt-green-ink" : ""}`}
          onChange={(e) => {
            const to = asStep(e.target.value);
            if (to && to !== o.step) onChange({ kind: "step", order: o, to });
          }}
        >
          {!asStep(o.step ?? "") && <option value={o.step ?? ""} disabled>{o.step ? t.productionStep[o.step as ProductionStep] : ""}</option>}
          {FLOW_STEPS.map((s) => <option key={s} value={s}>{t.productionStep[s]}</option>)}
        </select>
      )}
      <IconButton
        icon="truck" size="sm" tone={o.da_giao ? "done" : "todo"} pressed={o.da_giao} disabled={busy || !perms.status}
        label={`${o.id}: ${o.da_giao ? l.quickDelivered : l.quickNotDelivered}`}
        onClick={() => onChange({ kind: "giao", order: o, to: !o.da_giao })}
      />
      <IconButton
        icon="cash" size="sm" tone={o.da_tat_toan ? "done" : "todo"} pressed={o.da_tat_toan} disabled={busy || !perms.status}
        label={`${o.id}: ${o.da_tat_toan ? l.quickSettled : l.quickNotSettled}`}
        onClick={() => onChange({ kind: "tatToan", order: o, to: !o.da_tat_toan })}
      />
      {o.da_gui_email && (
        <span title={l.quickEmailed} className="inline-flex size-9 items-center justify-center rounded-lg text-pt-green-ink">
          <Icon name="mail" className="size-4.5" />
          <span className="sr-only">{l.quickEmailed}</span>
        </span>
      )}
    </span>
  );
}
