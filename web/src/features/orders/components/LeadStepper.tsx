// 5-step strip for a quote request: Mới → Phân công → Báo giá → Gửi khách → Chốt / Sản xuất,
// plus the viewer's next action (same wording as the portal workflow stepper).
import { format, getDictionary } from "@/i18n";
import { Icon } from "@/features/portal-ui/components/Icon";
import { nextActionFor, type Actor } from "@/features/portal-ui";
import type { AppRole, LeadStatus } from "@/lib/types";
import { LEAD_STEPS, leadStepIndex } from "../lib/lead-board";

const t = getDictionary();
const c = t.leadsUi;
const p = t.portalUi;

const LABEL = { new: c.stepNew, assign: c.stepAssign, quote: c.stepQuote, sent: c.stepSent, won: c.stepWon } as const;
const ACTOR: Record<Actor, string> = {
  admin: p.actorAdmin, pricing: p.actorPricing, field: p.actorField, customer: p.actorCustomer, workshop: p.actorWorkshop,
};

export function LeadStepper({ status, role }: { status: LeadStatus; role: AppRole }) {
  const idx = leadStepIndex(status);
  const finished = status === "done";
  const next = nextActionFor(status, role);
  return (
    <div className="flex flex-col gap-3">
      {/* tabIndex: scrolls sideways on phones; keyboard users need focus to scroll it. */}
      <ol aria-label={c.stepsLabel} tabIndex={0} className="flex gap-1 overflow-x-auto pb-1">
        {LEAD_STEPS.map((s, i) => {
          const state = idx < 0 ? "todo" : i < idx || (finished && i === idx) ? "done" : i === idx ? "current" : "todo";
          return (
            <li key={s.key} aria-current={state === "current" ? "step" : undefined} className="flex min-w-16 flex-1 flex-col gap-1.5 sm:min-w-24">
              <span className={`h-1.5 rounded-full ${state === "todo" ? "bg-pt-grey-tint" : state === "current" ? "bg-vt-yellow" : "bg-vt-blue"}`} />
              <span className={`flex items-center gap-1 text-xs ${state === "current" ? "font-bold text-pt-text" : state === "done" ? "text-pt-text" : "text-pt-muted"}`}>
                {state === "done" && <Icon name="check" className="size-3.5 text-vt-blue" />}
                {LABEL[s.key]}
                {state === "done" && <span className="sr-only">({p.stepPassed})</span>}
              </span>
            </li>
          );
        })}
      </ol>
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm" aria-live="polite">
        {status === "cancelled" ? (
          <span className="font-medium text-pt-red-ink">{p.cancelledNote}</span>
        ) : !next ? (
          <span className="font-medium text-pt-green-ink">{p.finished}</span>
        ) : (
          <>
            <span className="text-pt-muted">{p.nextAction}:</span>
            <span className="font-semibold text-pt-text">{p[next.actionKey]}</span>
            {next.mine ? (
              <span className="rounded-full bg-vt-yellow px-2.5 py-0.5 text-xs font-bold text-vt-ink">{p.yourTurn}</span>
            ) : (
              <span className="rounded-full bg-pt-grey-tint px-2.5 py-0.5 text-xs font-medium text-pt-grey-ink">{format(p.waitingFor, { actor: ACTOR[next.actor] })}</span>
            )}
          </>
        )}
      </p>
    </div>
  );
}
