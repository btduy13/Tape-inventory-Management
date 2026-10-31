// Customer response (accept / request changes). Single-use: the token is consumed with an
// atomic conditional UPDATE before the quote changes; the quote update itself only matches
// status = 'sent', so a race or replay can never answer twice.
import type { LeadStatus } from "@/lib/types";
import { leadStatusAfterResponse } from "../lib/rules";
import { respondSchema } from "../lib/schemas";
import { evaluateTokenAccess } from "../lib/token";
import type { TokenBundle } from "./token-lookup";

export interface RespondDeps {
  find(rawToken: string): Promise<TokenBundle | null>;
  /** UPDATE quote_tokens SET revoked_at, last_used_at WHERE id AND revoked_at IS NULL AND expires_at > now. */
  consumeToken(tokenId: string, nowIso: string): Promise<boolean>;
  /** UPDATE quotes SET status, responded_at, note WHERE id AND status = 'sent'. */
  markResponded(
    quoteId: string,
    status: "accepted" | "changes_requested",
    note: string | null,
    nowIso: string,
  ): Promise<boolean>;
  setLeadStatus(leadId: string, to: LeadStatus, note: string): Promise<void>;
  addLeadNote(leadId: string, body: string): Promise<void>;
  staffEmail(userId: string): Promise<string | null>;
  notify(data: {
    leadId: string;
    code: string;
    customerName: string;
    response: "accepted" | "changes_requested";
    note: string | null;
    quoteVersion: number;
    staffEmail: string | null;
  }): Promise<unknown>;
  now(): Date;
}

export type RespondError = "invalid_body" | "invalid_token" | "already_used" | "quote_expired" | "conflict";
export type RespondOutcome =
  | { ok: true; result: "accepted" | "changes_requested" }
  | { ok: false; error: RespondError };

export const RESPOND_HTTP_STATUS: Record<RespondError, number> = {
  invalid_body: 400,
  invalid_token: 404,
  already_used: 409,
  quote_expired: 410,
  conflict: 409,
};

export async function respondToQuote(deps: RespondDeps, rawToken: string, body: unknown): Promise<RespondOutcome> {
  const parsed = respondSchema.safeParse(body);
  if (!parsed.success) return { ok: false, error: "invalid_body" };
  const input = parsed.data;

  const bundle = await deps.find(rawToken);
  const now = deps.now();
  const access = evaluateTokenAccess(bundle?.token ?? null, bundle?.quote ?? null, now);
  if (!bundle || access === "invalid") return { ok: false, error: "invalid_token" };
  if (access === "used") return { ok: false, error: "already_used" };
  if (access === "quote_expired") return { ok: false, error: "quote_expired" };

  const nowIso = now.toISOString();
  if (!(await deps.consumeToken(bundle.token.id, nowIso))) return { ok: false, error: "already_used" };

  const status = input.action === "accept" ? "accepted" : "changes_requested";
  if (!(await deps.markResponded(bundle.quote.id, status, input.note, nowIso))) {
    return { ok: false, error: "conflict" };
  }

  const { lead, quote } = bundle;
  const label = status === "accepted" ? "Khách chấp nhận" : "Khách yêu cầu chỉnh sửa";
  const logNote = `${label} báo giá phiên bản ${quote.version}`;
  // Side effects below must not turn a recorded answer into an error for the customer.
  const nextLead = leadStatusAfterResponse(lead.status, input.action);
  if (nextLead) {
    await deps.setLeadStatus(lead.id, nextLead, logNote).catch((e: unknown) => console.error("[quotes] lead status", e));
  }
  if (input.note) {
    await deps
      .addLeadNote(lead.id, `${logNote}: ${input.note}`)
      .catch((e: unknown) => console.error("[quotes] lead note", e));
  }
  const staffEmail = lead.assigned_to ? await deps.staffEmail(lead.assigned_to).catch(() => null) : null;
  await deps
    .notify({
      leadId: lead.id,
      code: lead.code,
      customerName: lead.customer_name,
      response: status,
      note: input.note,
      quoteVersion: quote.version,
      staffEmail,
    })
    .catch((e: unknown) => console.error("[quotes] notify", e));

  return { ok: true, result: status };
}
