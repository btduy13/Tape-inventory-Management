// Lead status + production step badges. Same tone everywhere (lib/status-tones.ts).
import { getDictionary } from "@/i18n";
import type { LeadStatus, ProductionStep } from "@/lib/types";
import { LEAD_TONE, STEP_TONE, TONE_CLASS, TONE_DOT, isStruck, type Tone } from "../lib/status-tones";

const t = getDictionary();

type Size = "sm" | "md";

function Badge({ tone, label, struck, size = "sm" }: { tone: Tone; label: string; struck?: boolean; size?: Size }) {
  const pad = size === "md" ? "px-3 py-1 text-sm" : "px-2.5 py-0.5 text-xs";
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full font-semibold ${pad} ${TONE_CLASS[tone]} ${struck ? "line-through" : ""}`}>
      <span aria-hidden className={`size-1.5 rounded-full ${TONE_DOT[tone]}`} />
      {label}
    </span>
  );
}

export function StatusBadge({ status, size }: { status: LeadStatus; size?: Size }) {
  return <Badge tone={LEAD_TONE[status]} label={t.leadStatus[status]} struck={isStruck(status)} size={size} />;
}

export function StepBadge({ step, size }: { step: ProductionStep; size?: Size }) {
  return <Badge tone={STEP_TONE[step]} label={t.productionStep[step]} struck={isStruck(step)} size={size} />;
}

/** Generic badge for other enums (quote status, user role, active / inactive). */
export function ToneBadge({ tone, children, size }: { tone: Tone; children: string; size?: Size }) {
  return <Badge tone={tone} label={children} size={size} />;
}
