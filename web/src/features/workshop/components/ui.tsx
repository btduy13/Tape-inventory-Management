// Small workshop-only pieces on top of the portal kit: due-date badge, colour swatches, size line.
// Deep imports: this file is also pulled into client components (floorButton).
import { Icon } from "@/features/portal-ui/components/Icon";
import { TONE_CLASS, type Tone } from "@/features/portal-ui/lib/status-tones";
import { getDictionary } from "@/i18n";
import type { ProductionStep } from "@/lib/types";
import { dueState, formatDueDate, type DueState } from "../lib/dates";

const t = getDictionary();

/** Shop-floor primary button: taller than the kit default (gloves, phones on a bench). */
export const floorButton =
  "inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-lg bg-vt-blue px-4 py-3 text-base font-bold text-white hover:bg-vt-blue-ink disabled:cursor-not-allowed disabled:opacity-55";

const DUE_TONE: Partial<Record<DueState, Tone>> = { overdue: "red", today: "yellow", soon: "amber" };

const DUE_LABEL: Partial<Record<DueState, string>> = {
  overdue: t.workshop.overdue,
  today: t.workshop.dueToday,
  soon: t.workshop.dueSoon,
};

/** Date + a worded state (never colour alone). Closed jobs are never overdue. */
export function DueBadge({ dueDate, step, size = "sm" }: { dueDate: string | null; step: ProductionStep; size?: "sm" | "md" }) {
  const state = dueState(dueDate, step);
  if (state === "none") return <span className="text-sm text-pt-muted">{t.workshop.noDueDate}</span>;
  const tone = DUE_TONE[state];
  const label = DUE_LABEL[state];
  const pad = size === "md" ? "px-3 py-1 text-sm" : "px-2.5 py-0.5 text-xs";
  if (!tone) return <span className="text-sm text-pt-text" data-due={state}>{formatDueDate(dueDate)}</span>;
  return (
    <span data-due={state} className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full font-semibold ${pad} ${TONE_CLASS[tone]}`}>
      {state === "overdue" ? <Icon name="alert" className="size-3.5" /> : <Icon name="calendar" className="size-3.5" />}
      {formatDueDate(dueDate)}
      {label && <span>· {label}</span>}
    </span>
  );
}

export function ColorSwatches({ colors, size = "sm" }: { colors: string[] | null; size?: "sm" | "md" }) {
  if (!colors?.length) return <span>—</span>;
  const px = size === "md" ? 24 : 16;
  return (
    <span className="flex flex-wrap gap-2">
      {colors.map((c) => (
        <span key={c} className="inline-flex items-center gap-1.5 rounded-lg border border-pt-line-strong bg-pt-surface px-2 py-1 text-xs font-medium tabular-nums">
          {/* SVG fill attribute, not an inline style: the production CSP blocks style attributes. */}
          <svg aria-hidden width={px} height={px} viewBox="0 0 16 16" className="rounded-sm border border-pt-line-strong">
            <rect width="16" height="16" fill={/^#[0-9a-f]{3,8}$/i.test(c) ? c : "transparent"} />
          </svg>
          {c}
        </span>
      ))}
    </span>
  );
}
