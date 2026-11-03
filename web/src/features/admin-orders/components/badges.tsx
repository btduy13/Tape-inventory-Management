// Small badges of the order pages (workshop step, origin). Universal components.
import { ToneBadge } from "@/features/portal-ui/components/StatusBadge";
import { ORIGIN_LABEL, STEP_LABEL, STEP_TONE, ordersCopy as c } from "../lib/copy";
import type { OrderOrigin, OrderStep } from "../lib/types";

export function OrderStepBadge({ step, size }: { step: OrderStep | null; size?: "sm" | "md" }) {
  if (!step) return <ToneBadge tone="grey" size={size}>{c.noJob}</ToneBadge>;
  return <ToneBadge tone={STEP_TONE[step] ?? "grey"} size={size}>{STEP_LABEL[step] ?? step}</ToneBadge>;
}

export function OriginBadge({ origin }: { origin: OrderOrigin }) {
  return <ToneBadge tone={origin === "app" ? "grey" : "blue"}>{ORIGIN_LABEL[origin]}</ToneBadge>;
}
