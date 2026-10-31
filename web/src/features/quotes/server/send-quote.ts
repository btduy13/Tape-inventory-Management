// Send flow (pure orchestration; I/O injected so it is unit-testable).
// Order: validate -> PDF -> upload -> token -> email -> revoke older links -> mark sent
//        -> cancel other open versions of the lead -> lead quoted.
// If the email fails the new token is revoked and the quote stays as it was.
import type { LeadStatus } from "@/lib/types";
import { leadStatusAfterSend, sendBlocker, type SendBlocker } from "../lib/rules";
import { createQuoteToken } from "../lib/token";
import type { QuoteLeadInfo, QuoteWithLines } from "../lib/types";
import type { QuotePdfData } from "./pdf/quote-document";

export interface SendContext {
  quote: QuoteWithLines;
  lead: QuoteLeadInfo;
}

export interface SendDeps {
  loadContext(quoteId: string): Promise<SendContext | null>;
  renderPdf(data: QuotePdfData): Promise<Uint8Array>;
  uploadPdf(path: string, bytes: Uint8Array): Promise<void>;
  insertToken(quoteId: string, tokenHash: string, expiresAt: string): Promise<string>;
  revokeTokens(quoteId: string, opts: { exceptId?: string; onlyId?: string }): Promise<void>;
  sendEmail(input: {
    ctx: SendContext;
    token: string;
    expiresAt: string;
    pdf: Uint8Array;
  }): Promise<{ ok: boolean }>;
  markSent(quoteId: string, pdfPath: string, sentAt: string): Promise<void>;
  /**
   * Cancels every OTHER still-open (`sent`) quote of the lead and revokes its links, so the
   * customer can only answer the newest version (an older link must not accept old prices).
   */
  supersedeOtherQuotes(leadId: string, keepQuoteId: string): Promise<void>;
  setLeadStatus(leadId: string, to: LeadStatus, note: string): Promise<void>;
  ttlDays: number;
  now(): Date;
}

export type SendError = SendBlocker | "not_found" | "pdf_failed" | "email_failed" | "store_failed";
export type SendOutcome = { ok: true; sentAt: string; linkExpiresAt: string } | { ok: false; error: SendError };

export const pdfPathFor = (leadId: string, quoteId: string) => `${leadId}/${quoteId}.pdf`;

export function toPdfData(ctx: SendContext, issuedAt: string): QuotePdfData {
  const { quote, lead } = ctx;
  return {
    code: lead.code,
    customerName: lead.customer_name,
    company: lead.company,
    phone: lead.phone,
    version: quote.version,
    issuedAt,
    validUntil: quote.valid_until,
    notes: quote.notes,
    vatPercent: quote.vat_percent,
    subtotal: quote.subtotal,
    vatAmount: quote.vat_amount,
    total: quote.total,
    lines: quote.lines,
  };
}

export async function sendQuote(deps: SendDeps, quoteId: string): Promise<SendOutcome> {
  const ctx = await deps.loadContext(quoteId);
  if (!ctx) return { ok: false, error: "not_found" };

  const blocker = sendBlocker({
    status: ctx.quote.status,
    lineCount: ctx.quote.lines.length,
    customerEmail: ctx.lead.email,
    total: ctx.quote.total,
  });
  if (blocker) return { ok: false, error: blocker };

  const now = deps.now();
  const sentAt = now.toISOString();
  const pdfPath = pdfPathFor(ctx.lead.id, ctx.quote.id);

  let pdf: Uint8Array;
  try {
    pdf = await deps.renderPdf(toPdfData(ctx, sentAt));
    await deps.uploadPdf(pdfPath, pdf);
  } catch {
    return { ok: false, error: "pdf_failed" };
  }

  const tok = await createQuoteToken(deps.ttlDays, now);
  let tokenId: string;
  try {
    tokenId = await deps.insertToken(ctx.quote.id, tok.tokenHash, tok.expiresAt);
  } catch {
    return { ok: false, error: "store_failed" };
  }

  const mail = await deps.sendEmail({ ctx, token: tok.token, expiresAt: tok.expiresAt, pdf });
  if (!mail.ok) {
    await deps.revokeTokens(ctx.quote.id, { onlyId: tokenId }).catch(() => undefined);
    return { ok: false, error: "email_failed" };
  }

  // Re-send: only the newest link stays valid.
  await deps.revokeTokens(ctx.quote.id, { exceptId: tokenId }).catch(() => undefined);

  try {
    await deps.markSent(ctx.quote.id, pdfPath, sentAt);
  } catch {
    return { ok: false, error: "store_failed" };
  }

  await deps
    .supersedeOtherQuotes(ctx.lead.id, ctx.quote.id)
    .catch((e: unknown) => console.error("[quotes] superseding older versions failed", e));

  const nextLead = leadStatusAfterSend(ctx.lead.status);
  if (nextLead) {
    await deps
      .setLeadStatus(ctx.lead.id, nextLead, `Đã gửi báo giá phiên bản ${ctx.quote.version}`)
      .catch((e: unknown) => console.error("[quotes] lead status update failed", e));
  }
  return { ok: true, sentAt, linkExpiresAt: tok.expiresAt };
}
