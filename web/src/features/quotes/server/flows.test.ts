// Unit tests for the send + customer-response orchestration (all I/O faked).
import { describe, expect, it, vi } from "vitest";
import { sha256Hex } from "@/lib/security/hash";
import type { Quote, QuoteLine } from "@/lib/types";
import { respondToQuote, type RespondDeps } from "./respond";
import { sendQuote, type SendContext, type SendDeps } from "./send-quote";
import type { TokenBundle } from "./token-lookup";

const NOW = new Date("2026-05-01T03:00:00.000Z");
const LEAD_ID = "11111111-1111-4111-8111-111111111111";
const QUOTE_ID = "22222222-2222-4222-8222-222222222222";

function quote(over: Partial<Quote> = {}): Quote {
  return {
    id: QUOTE_ID, lead_id: LEAD_ID, version: 1, status: "draft", currency: "VND",
    subtotal: 1_000_000, vat_percent: 8, vat_amount: 80_000, total: 1_080_000,
    valid_until: null, notes: null, pdf_path: null, created_by: null, sent_at: null,
    responded_at: null, customer_response_note: null, created_at: NOW.toISOString(), updated_at: NOW.toISOString(),
    ...over,
  };
}

const line: QuoteLine = {
  id: "33333333-3333-4333-8333-333333333333", quote_id: QUOTE_ID, sort_order: 0,
  description: "Băng keo 48mm", unit: "cuộn", quantity: 100, unit_price: 10_000, line_total: 1_000_000,
};

function sendCtx(over: Partial<Quote> = {}, email: string | null = "khach@example.com"): SendContext {
  return {
    quote: { ...quote(over), lines: [line] },
    lead: {
      id: LEAD_ID, code: "L-0001", customer_name: "Nguyễn Văn A", email, phone: "0912345678",
      company: null, status: "consulting", assigned_to: null,
    },
  };
}

function sendDeps(ctx: SendContext | null, over: Partial<SendDeps> = {}) {
  const deps = {
    loadContext: vi.fn(async () => ctx),
    renderPdf: vi.fn(async () => new Uint8Array([37, 80, 68, 70])),
    uploadPdf: vi.fn(async () => undefined),
    insertToken: vi.fn(async () => "tok-1"),
    revokeTokens: vi.fn(async () => undefined),
    sendEmail: vi.fn(async () => ({ ok: true })),
    markSent: vi.fn(async () => undefined),
    supersedeOtherQuotes: vi.fn(async () => undefined),
    setLeadStatus: vi.fn(async () => undefined),
    ttlDays: 14,
    now: () => NOW,
    ...over,
  } satisfies SendDeps;
  return deps;
}

describe("sendQuote", () => {
  it("stores only the sha256 of the emailed token, with TTL expiry, then marks sent + lead quoted", async () => {
    const deps = sendDeps(sendCtx());
    const res = await sendQuote(deps, QUOTE_ID);
    expect(res).toEqual({ ok: true, sentAt: NOW.toISOString(), linkExpiresAt: "2026-05-15T03:00:00.000Z" });

    const [, storedHash, expiresAt] = vi.mocked(deps.insertToken).mock.calls[0] as unknown as [string, string, string];
    const { token } = (vi.mocked(deps.sendEmail).mock.calls[0] as unknown as [{ token: string }])[0];
    expect(storedHash).toBe(await sha256Hex(token));
    expect(storedHash).not.toBe(token);
    expect(expiresAt).toBe("2026-05-15T03:00:00.000Z");

    expect(deps.uploadPdf).toHaveBeenCalledWith(`${LEAD_ID}/${QUOTE_ID}.pdf`, expect.any(Uint8Array));
    expect(deps.revokeTokens).toHaveBeenCalledWith(QUOTE_ID, { exceptId: "tok-1" });
    expect(deps.markSent).toHaveBeenCalledWith(QUOTE_ID, `${LEAD_ID}/${QUOTE_ID}.pdf`, NOW.toISOString());
    expect(deps.setLeadStatus).toHaveBeenCalledWith(LEAD_ID, "quoted", expect.any(String));
  });

  it("cancels other open versions of the lead after a successful send (no stale-price accept)", async () => {
    const deps = sendDeps(sendCtx());
    await sendQuote(deps, QUOTE_ID);
    expect(deps.supersedeOtherQuotes).toHaveBeenCalledWith(LEAD_ID, QUOTE_ID);
    const order = (fn: unknown) => vi.mocked(fn as () => void).mock.invocationCallOrder[0]!;
    expect(order(deps.supersedeOtherQuotes)).toBeGreaterThan(order(deps.markSent));
  });

  it("does not supersede anything when the send fails", async () => {
    const deps = sendDeps(sendCtx(), { sendEmail: vi.fn(async () => ({ ok: false })) });
    await sendQuote(deps, QUOTE_ID);
    expect(deps.supersedeOtherQuotes).not.toHaveBeenCalled();
  });

  it("revokes the new token and keeps the quote unsent when the email fails", async () => {
    const deps = sendDeps(sendCtx(), { sendEmail: vi.fn(async () => ({ ok: false })) });
    expect(await sendQuote(deps, QUOTE_ID)).toEqual({ ok: false, error: "email_failed" });
    expect(deps.revokeTokens).toHaveBeenCalledWith(QUOTE_ID, { onlyId: "tok-1" });
    expect(deps.markSent).not.toHaveBeenCalled();
  });

  it("blocks before any side effect when not sendable", async () => {
    const noEmail = sendDeps(sendCtx({}, null));
    expect(await sendQuote(noEmail, QUOTE_ID)).toEqual({ ok: false, error: "no_customer_email" });
    const accepted = sendDeps(sendCtx({ status: "accepted" }));
    expect(await sendQuote(accepted, QUOTE_ID)).toEqual({ ok: false, error: "not_sendable" });
    expect(await sendQuote(sendDeps(null), QUOTE_ID)).toEqual({ ok: false, error: "not_found" });
    expect(noEmail.renderPdf).not.toHaveBeenCalled();
    expect(accepted.insertToken).not.toHaveBeenCalled();
  });

  it("reports pdf_failed without creating a token", async () => {
    const deps = sendDeps(sendCtx(), {
      renderPdf: vi.fn(async (): Promise<Uint8Array> => {
        throw new Error("font");
      }),
    });
    expect(await sendQuote(deps, QUOTE_ID)).toEqual({ ok: false, error: "pdf_failed" });
    expect(deps.insertToken).not.toHaveBeenCalled();
  });
});

function bundle(quoteOver: Partial<Quote> = {}, tokenOver: Partial<TokenBundle["token"]> = {}): TokenBundle {
  return {
    token: { id: "tok-1", quote_id: QUOTE_ID, expires_at: "2026-05-10T00:00:00.000Z", revoked_at: null, ...tokenOver },
    quote: quote({ status: "sent", ...quoteOver }),
    lines: [line],
    lead: { id: LEAD_ID, code: "L-0001", customer_name: "A", company: null, status: "quoted", assigned_to: "staff-1" },
  };
}

function respondDeps(b: TokenBundle | null, over: Partial<RespondDeps> = {}) {
  const deps = {
    find: vi.fn(async () => b),
    consumeToken: vi.fn(async () => true),
    markResponded: vi.fn(async () => true),
    setLeadStatus: vi.fn(async () => undefined),
    addLeadNote: vi.fn(async () => undefined),
    staffEmail: vi.fn(async () => "staff@example.com"),
    notify: vi.fn(async () => undefined),
    now: () => NOW,
    ...over,
  } satisfies RespondDeps;
  return deps;
}

describe("respondToQuote", () => {
  it("accept: consumes the token, marks quote + lead accepted, notifies staff", async () => {
    const deps = respondDeps(bundle());
    expect(await respondToQuote(deps, "raw", { action: "accept" })).toEqual({ ok: true, result: "accepted" });
    expect(deps.consumeToken).toHaveBeenCalledWith("tok-1", NOW.toISOString());
    expect(deps.markResponded).toHaveBeenCalledWith(QUOTE_ID, "accepted", null, NOW.toISOString());
    expect(deps.setLeadStatus).toHaveBeenCalledWith(LEAD_ID, "accepted", expect.any(String));
    expect(deps.notify).toHaveBeenCalledWith(expect.objectContaining({ response: "accepted", staffEmail: "staff@example.com" }));
  });

  it("request changes requires a note and records it on the lead", async () => {
    const deps = respondDeps(bundle());
    expect(await respondToQuote(deps, "raw", { action: "request_changes" })).toEqual({ ok: false, error: "invalid_body" });
    const res = await respondToQuote(deps, "raw", { action: "request_changes", note: "Đổi màu nền" });
    expect(res).toEqual({ ok: true, result: "changes_requested" });
    expect(deps.setLeadStatus).toHaveBeenCalledWith(LEAD_ID, "consulting", expect.any(String));
    expect(deps.addLeadNote).toHaveBeenCalledWith(LEAD_ID, expect.stringContaining("Đổi màu nền"));
  });

  it("is single-use: a lost consume race or an answered quote never answers twice", async () => {
    const raced = respondDeps(bundle(), { consumeToken: vi.fn(async () => false) });
    expect(await respondToQuote(raced, "raw", { action: "accept" })).toEqual({ ok: false, error: "already_used" });
    expect(raced.markResponded).not.toHaveBeenCalled();

    const answered = respondDeps(bundle({ status: "accepted" }, { revoked_at: NOW.toISOString() }));
    expect(await respondToQuote(answered, "raw", { action: "accept" })).toEqual({ ok: false, error: "already_used" });
  });

  it("rejects unknown, expired-link and expired-quote tokens", async () => {
    expect(await respondToQuote(respondDeps(null), "raw", { action: "accept" })).toEqual({ ok: false, error: "invalid_token" });
    const linkExpired = respondDeps(bundle({}, { expires_at: "2026-04-30T00:00:00.000Z" }));
    expect(await respondToQuote(linkExpired, "raw", { action: "accept" })).toEqual({ ok: false, error: "invalid_token" });
    const quoteExpired = respondDeps(bundle({ valid_until: "2026-04-01" }));
    expect(await respondToQuote(quoteExpired, "raw", { action: "accept" })).toEqual({ ok: false, error: "quote_expired" });
    expect(quoteExpired.consumeToken).not.toHaveBeenCalled();
  });

  it("a failing notification does not turn a recorded answer into an error", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const deps = respondDeps(bundle(), {
      notify: vi.fn(async (): Promise<unknown> => {
        throw new Error("smtp");
      }),
    });
    expect(await respondToQuote(deps, "raw", { action: "accept" })).toEqual({ ok: true, result: "accepted" });
    spy.mockRestore();
  });
});
