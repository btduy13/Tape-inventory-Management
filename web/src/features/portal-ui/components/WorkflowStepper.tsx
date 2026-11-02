// The lead pipeline drawn as a strip of packing tape: passed segments are solid blue, the
// current segment is the yellow tape piece, later ones are outlined. Below it: the next
// action and who owns it ("Đến lượt bạn" when it is the viewer's role).
import { format, getDictionary } from "@/i18n";
import type { AppRole, LeadStatus, ProductionStep } from "@/lib/types";
import { LEAD_PIPELINE, PRODUCTION_FLOW, nextActionFor, pipelineIndex, stageStates, stepIndex, type Actor, type StageState } from "../lib/workflow";
import { Icon } from "./Icon";

const t = getDictionary();
const p = t.portalUi;

const ACTOR_LABEL: Record<Actor, string> = {
  admin: p.actorAdmin,
  pricing: p.actorPricing,
  field: p.actorField,
  customer: p.actorCustomer,
  workshop: p.actorWorkshop,
};

const SEG: Record<StageState, string> = {
  done: "bg-vt-blue text-white",
  current: "bg-vt-yellow text-vt-ink font-bold",
  todo: "bg-pt-grey-tint text-pt-muted",
};

function Strip({ labels, states, label }: { labels: string[]; states: StageState[]; label: string }) {
  return (
    // tabIndex: the strip scrolls sideways on narrow screens; keyboard users need focus to scroll it (WCAG 2.1.1).
    <ol aria-label={label} tabIndex={0} className="flex w-full gap-0.5 overflow-x-auto pb-1">
      {labels.map((l, i) => (
        <li
          key={l}
          aria-current={states[i] === "current" ? "step" : undefined}
          className={`pt-tape-seg flex min-h-11 min-w-28 flex-1 items-center justify-center gap-1 px-4 text-center text-xs leading-tight ${SEG[states[i]!]}`}
        >
          {states[i] === "done" && <Icon name="check" className="size-3.5" />}
          <span>{l}</span>
          {states[i] === "done" && <span className="sr-only">({p.stepPassed})</span>}
        </li>
      ))}
    </ol>
  );
}

type Props = {
  status: LeadStatus;
  /** Viewer role: decides "Đến lượt bạn" vs "Chờ: ...". */
  role: AppRole;
  /** Hide the next-action line (e.g. in dense list headers). */
  compact?: boolean;
};

export function WorkflowStepper({ status, role, compact }: Props) {
  const idx = pipelineIndex(status);
  const states = stageStates(LEAD_PIPELINE.length, idx, status === "done");
  const next = nextActionFor(status, role);
  return (
    <div className="flex flex-col gap-2">
      <Strip label={p.workflow} labels={LEAD_PIPELINE.map((s) => t.leadStatus[s.status])} states={states} />
      {!compact && (
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm" aria-live="polite">
          {status === "cancelled" ? (
            <span className="font-medium text-pt-grey-ink">{p.cancelledNote}</span>
          ) : !next ? (
            <span className="font-medium text-pt-green-ink">{p.finished}</span>
          ) : (
            <>
              <span className="text-pt-muted">{p.nextAction}:</span>
              <span className="font-semibold text-pt-text">{p[next.actionKey]}</span>
              {next.mine ? (
                <span className="rounded-full bg-vt-yellow px-2.5 py-0.5 text-xs font-bold text-vt-ink">{p.yourTurn}</span>
              ) : (
                <span className="rounded-full bg-pt-grey-tint px-2.5 py-0.5 text-xs font-medium text-pt-grey-ink">
                  {format(p.waitingFor, { actor: ACTOR_LABEL[next.actor] })}
                </span>
              )}
            </>
          )}
        </p>
      )}
    </div>
  );
}

/** Production steps of one job (workshop pages, lead detail production panel). */
export function ProductionStepper({ step }: { step: ProductionStep }) {
  const idx = stepIndex(step);
  const states = stageStates(PRODUCTION_FLOW.length, idx, step === "da_giao");
  return (
    <div className="flex flex-col gap-2">
      <Strip label={p.productionFlow} labels={PRODUCTION_FLOW.map((s) => t.productionStep[s])} states={states} />
      {step === "huy" && <p className="text-sm font-medium text-pt-grey-ink">{p.cancelledNote}</p>}
    </div>
  );
}
