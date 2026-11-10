// Small lead display pieces shared by the list (client) and the detail page (server).
import { format, getDictionary } from "@/i18n";
import { Icon } from "@/features/portal-ui/components/Icon";
import { ToneBadge } from "@/features/portal-ui/components/StatusBadge";
import type { LeadStatus } from "@/lib/types";
import { LEAD_BADGE_TONE, leadWaiting, waitingParts } from "../lib/lead-board";

const t = getDictionary();
const c = t.leadsUi;

export function LeadBadge({ status, size }: { status: LeadStatus; size?: "sm" | "md" }) {
  return <ToneBadge tone={LEAD_BADGE_TONE[status]} size={size}>{t.leadStatus[status]}</ToneBadge>;
}

const WAIT_TEXT = { grey: "text-pt-muted", amber: "font-semibold text-pt-amber-ink", red: "font-semibold text-pt-red-ink" } as const;

export function waitingText(hours: number): string {
  const { unit, count } = waitingParts(hours);
  return unit === "lessHour" ? c.waitLessHour : format(unit === "hours" ? c.waitHours : c.waitDays, { count });
}

/** "5 giờ" coloured by age; "—" for closed / workshop statuses. `now` comes from the loader so server render and hydration agree. */
export function WaitingTag({ status, since, now, prefix }: { status: LeadStatus; since: string; now: number; prefix?: boolean }) {
  const w = leadWaiting(status, since, now);
  if (!w) return <span className="text-pt-muted">—</span>;
  const text = waitingText(w.hours);
  return (
    <span title={c.waitingHint} className={`inline-flex items-center gap-1 whitespace-nowrap ${WAIT_TEXT[w.tone]}`}>
      {w.tone === "red" && <Icon name="alert" className="size-3.5" />}
      {prefix ? format(c.waitingSince, { time: text.toLowerCase() }) : text}
    </span>
  );
}
