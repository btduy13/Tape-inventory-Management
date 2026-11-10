// One status badge per quote (list + detail): not sent = grey, sent by email = yellow (waiting on
// the customer), same tones as the lead "Đã báo giá" status.
import { getDictionary } from "@/i18n";
import { ToneBadge } from "@/features/portal-ui/components/StatusBadge";
import type { QuoteStatus } from "../lib/list";

const c = getDictionary().baoGia;

export const STATUS_LABEL: Readonly<Record<QuoteStatus, string>> = { chua_gui: c.statusDraft, da_gui: c.statusSent };
export const typeShort = (t: string) => (c.typeShort as Record<string, string>)[t] ?? t;

export function QuoteStatusBadge({ status, size }: { status: QuoteStatus; size?: "sm" | "md" }) {
  return <ToneBadge tone={status === "da_gui" ? "yellow" : "grey"} size={size}>{STATUS_LABEL[status]}</ToneBadge>;
}
