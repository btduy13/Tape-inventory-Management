// Small badges of the order pages (workshop step, origin, status). Universal components.
// Step labels / tones are the shared ones (portal-ui StepBadge), same as /portal/xuong.
import Link from "next/link";
import { StepBadge, ToneBadge } from "@/features/portal-ui/components/StatusBadge";
import type { ProductionStep } from "@/lib/types";
import { ORIGIN_LABEL, ordersCopy as c } from "../lib/copy";
import type { OrderOrigin } from "../lib/types";

export function OrderStepBadge({ step, size }: { step: ProductionStep | null; size?: "sm" | "md" }) {
  return step ? <StepBadge step={step} size={size} /> : <ToneBadge tone="grey" size={size}>{c.noJob}</ToneBadge>;
}

export function OriginBadge({ origin }: { origin: OrderOrigin }) {
  return <ToneBadge tone={origin === "app" ? "grey" : "blue"}>{ORIGIN_LABEL[origin]}</ToneBadge>;
}

/** Delivered / settled pair (quotes show "Báo giá" instead). */
export function OrderStatusBadges({ delivered, settled, isQuote }: { delivered: boolean; settled: boolean; isQuote: boolean }) {
  if (isQuote) return <ToneBadge tone="yellow">{c.quoteBadge}</ToneBadge>;
  return (
    <span className="flex flex-wrap gap-1">
      <ToneBadge tone={delivered ? "green" : "grey"}>{delivered ? c.delivered : c.notDelivered}</ToneBadge>
      <ToneBadge tone={settled ? "green" : "amber"}>{settled ? c.settled : c.notSettled}</ToneBadge>
    </span>
  );
}

/** Underline tabs: the list tabs and the type switch of the new-order page. */
export function PillNav({ label, current, items }: { label: string; current: string; items: readonly (readonly [string, string, string])[] }) {
  return (
    <nav aria-label={label} className="flex gap-1 overflow-x-auto border-b border-pt-line">
      {items.map(([key, text, href]) => {
        const on = key === current;
        return (
          <Link
            key={key}
            href={href}
            aria-current={on ? "page" : undefined}
            className={`-mb-px inline-flex min-h-11 shrink-0 items-center border-b-2 px-3 text-sm transition-colors ${on ? "border-vt-blue font-semibold text-pt-blue-ink" : "border-transparent font-medium text-pt-muted hover:border-pt-line-strong hover:text-pt-text"}`}
          >
            {text}
          </Link>
        );
      })}
    </nav>
  );
}
