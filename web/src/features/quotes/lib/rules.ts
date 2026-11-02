// Pure business rules for the quote workflow (mirrors the DB guards in migration 0011).
import type { LeadStatus, QuoteStatus } from "@/lib/types";

/** Lines / VAT are editable only while draft (quote_lines_guard). */
export const isEditable = (status: QuoteStatus) => status === "draft";

/** Draft can be sent; a sent quote can be re-sent (new link, old links revoked). */
export const isSendable = (status: QuoteStatus) => status === "draft" || status === "sent";

/** Answered / sent quotes are changed by creating version + 1. */
export const canCreateNewVersion = (status: QuoteStatus) =>
  status === "sent" || status === "changes_requested" || status === "expired" || status === "cancelled";

/**
 * Quotes shown on the lead page. Viewers who cannot price only see quotes that reached the
 * customer: a draft (often still 0 đ) would invite misquoting. Display only; RLS is unchanged.
 */
export function visibleQuotes<Q extends { status: QuoteStatus }>(quotes: readonly Q[], pricing: boolean): Q[] {
  return pricing ? [...quotes] : quotes.filter((q) => q.status !== "draft");
}

export type SendBlocker = "not_sendable" | "no_lines" | "no_customer_email" | "zero_total";

export function sendBlocker(input: {
  status: QuoteStatus;
  lineCount: number;
  customerEmail: string | null;
  total: number;
}): SendBlocker | null {
  if (!isSendable(input.status)) return "not_sendable";
  if (input.lineCount === 0) return "no_lines";
  if (!input.total || input.total <= 0) return "zero_total";
  if (!input.customerEmail) return "no_customer_email";
  return null;
}

const CLOSED: readonly LeadStatus[] = ["production", "shipping", "done", "cancelled"];

/** Lead status to set when a quote is sent (null = leave unchanged). */
export function leadStatusAfterSend(current: LeadStatus): LeadStatus | null {
  if (CLOSED.includes(current) || current === "accepted" || current === "quoted") return null;
  return "quoted";
}

/** Lead status after the customer answers (null = leave unchanged). */
export function leadStatusAfterResponse(
  current: LeadStatus,
  action: "accept" | "request_changes",
): LeadStatus | null {
  if (CLOSED.includes(current)) return null;
  if (action === "accept") return current === "accepted" ? null : "accepted";
  // Back to consulting so the assigned staff follows up on the requested changes.
  return current === "consulting" ? null : "consulting";
}
