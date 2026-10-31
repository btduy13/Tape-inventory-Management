import { describe, expect, it } from "vitest";
import { sha256Hex } from "@/lib/security/hash";
import { parseMoney, parseQty, toEditorState, toSaveInput } from "./editor-state";
import { leadStatusAfterResponse, leadStatusAfterSend, sendBlocker } from "./rules";
import { respondSchema, saveDraftSchema, tokenSchema } from "./schemas";
import { createQuoteToken, evaluateTokenAccess } from "./token";
import { estimateTotals, lineTotal } from "./totals";
import type { QuoteWithLines } from "./types";

const NOW = new Date("2026-11-01T00:00:00Z");
const future = "2026-11-10T00:00:00Z";
const past = "2026-10-01T00:00:00Z";

describe("createQuoteToken", () => {
  it("returns random base64url token, sha256 hash and expiry", async () => {
    const a = await createQuoteToken(14, NOW);
    const b = await createQuoteToken(14, NOW);
    expect(a.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(a.token).not.toBe(b.token);
    expect(a.tokenHash).toBe(await sha256Hex(a.token));
    expect(a.tokenHash).toMatch(/^[0-9a-f]{64}$/);
    expect(a.expiresAt).toBe("2026-11-15T00:00:00.000Z");
    expect(tokenSchema.safeParse(a.token).success).toBe(true);
  });
  it("tokenSchema rejects junk", () => {
    expect(tokenSchema.safeParse("short").success).toBe(false);
    expect(tokenSchema.safeParse("a".repeat(40) + "/../").success).toBe(false);
  });
});

describe("evaluateTokenAccess", () => {
  const tok = { expires_at: future, revoked_at: null };
  const sent = { status: "sent" as const, valid_until: null };
  it("open for a fresh token on a sent quote", () => {
    expect(evaluateTokenAccess(tok, sent, NOW)).toBe("open");
  });
  it("invalid when missing, expired, revoked-unanswered or not sent", () => {
    expect(evaluateTokenAccess(null, sent, NOW)).toBe("invalid");
    expect(evaluateTokenAccess({ ...tok, expires_at: past }, sent, NOW)).toBe("invalid");
    expect(evaluateTokenAccess({ ...tok, revoked_at: past }, sent, NOW)).toBe("invalid");
    expect(evaluateTokenAccess(tok, { ...sent, status: "draft" }, NOW)).toBe("invalid");
    expect(evaluateTokenAccess(tok, { ...sent, status: "cancelled" }, NOW)).toBe("invalid");
  });
  it("used after an answer (read-only)", () => {
    expect(evaluateTokenAccess({ ...tok, revoked_at: past }, { ...sent, status: "accepted" }, NOW)).toBe("used");
    expect(evaluateTokenAccess(tok, { ...sent, status: "changes_requested" }, NOW)).toBe("used");
  });
  it("quote_expired after valid_until (end of day, VN time)", () => {
    expect(evaluateTokenAccess(tok, { ...sent, valid_until: "2026-10-31" }, NOW)).toBe("quote_expired");
    expect(evaluateTokenAccess(tok, { ...sent, valid_until: "2026-11-01" }, NOW)).toBe("open");
  });
});

describe("totals estimate mirrors SQL rounding", () => {
  it("rounds lines to 2 decimals and VAT to integer", () => {
    expect(lineTotal(3, 0.335)).toBe(1.01);
    const t = estimateTotals([{ quantity: 100, unitPrice: 12_345 }, { quantity: 2.5, unitPrice: 1000 }], 8);
    expect(t).toEqual({ subtotal: 1_236_999.5 - 0.5 + 0.5 - 0.5 + 0.5 - 0.5 + 2500 - 2500 + 0, vatAmount: 98960, total: 1_335_959.5 - 0.5 });
  });
  it("NaN inputs count as 0", () => {
    expect(estimateTotals([{ quantity: Number.NaN, unitPrice: 5 }], Number.NaN)).toEqual({ subtotal: 0, vatAmount: 0, total: 0 });
  });
});

describe("schemas", () => {
  const base = {
    quoteId: "8b8f3c2e-1d4a-4c7b-9f0e-2a1b3c4d5e6f",
    vatPercent: 10,
    lines: [{ description: " Băng keo 48mm ", quantity: 100, unitPrice: 15000 }],
  };
  it("saveDraft trims and defaults unit", () => {
    const r = saveDraftSchema.parse(base);
    expect(r.lines[0]).toEqual({ description: "Băng keo 48mm", unit: "cuộn", quantity: 100, unitPrice: 15000 });
    expect(r.validUntil).toBeNull();
  });
  it("saveDraft rejects bad numbers / empty lines / bad VAT", () => {
    expect(saveDraftSchema.safeParse({ ...base, lines: [] }).success).toBe(false);
    expect(saveDraftSchema.safeParse({ ...base, vatPercent: 101 }).success).toBe(false);
    expect(saveDraftSchema.safeParse({ ...base, vatPercent: 8.123 }).success).toBe(false);
    expect(saveDraftSchema.safeParse({ ...base, lines: [{ ...base.lines[0], quantity: 0 }] }).success).toBe(false);
    expect(saveDraftSchema.safeParse({ ...base, lines: [{ ...base.lines[0], unitPrice: -1 }] }).success).toBe(false);
    expect(saveDraftSchema.safeParse({ ...base, lines: [{ ...base.lines[0], unitPrice: Number.NaN }] }).success).toBe(false);
    expect(saveDraftSchema.safeParse({ ...base, validUntil: "2026-13-45" }).success).toBe(false);
  });
  it("respond: changes need a note, accept note optional", () => {
    expect(respondSchema.parse({ action: "accept" })).toEqual({ action: "accept", note: null });
    expect(respondSchema.safeParse({ action: "request_changes", note: " " }).success).toBe(false);
    expect(respondSchema.safeParse({ action: "request_changes", note: "đổi màu" }).success).toBe(true);
    expect(respondSchema.safeParse({ action: "delete" }).success).toBe(false);
    expect(respondSchema.safeParse({ action: "accept", note: "x".repeat(2001) }).success).toBe(false);
  });
});

describe("rules", () => {
  it("sendBlocker", () => {
    const ok = { status: "draft" as const, lineCount: 1, customerEmail: "a@b.vn", total: 10 };
    expect(sendBlocker(ok)).toBeNull();
    expect(sendBlocker({ ...ok, status: "sent" })).toBeNull();
    expect(sendBlocker({ ...ok, status: "accepted" })).toBe("not_sendable");
    expect(sendBlocker({ ...ok, lineCount: 0 })).toBe("no_lines");
    expect(sendBlocker({ ...ok, total: 0 })).toBe("zero_total");
    expect(sendBlocker({ ...ok, customerEmail: null })).toBe("no_customer_email");
  });
  it("lead status after send / response", () => {
    expect(leadStatusAfterSend("consulting")).toBe("quoted");
    expect(leadStatusAfterSend("quoted")).toBeNull();
    expect(leadStatusAfterSend("production")).toBeNull();
    expect(leadStatusAfterResponse("quoted", "accept")).toBe("accepted");
    expect(leadStatusAfterResponse("quoted", "request_changes")).toBe("consulting");
    expect(leadStatusAfterResponse("cancelled", "accept")).toBeNull();
  });
});

describe("editor-state", () => {
  it("parses vi-VN money and decimal comma", () => {
    expect(parseMoney("1.234.567")).toBe(1234567);
    expect(parseMoney("15 000 ₫")).toBe(15000);
    expect(parseMoney("")).toBeNaN();
    expect(parseQty("2,5")).toBe(2.5);
  });
  it("round-trips a quote into a valid save input", () => {
    const q = {
      id: "8b8f3c2e-1d4a-4c7b-9f0e-2a1b3c4d5e6f",
      vat_percent: 8,
      valid_until: null,
      notes: null,
      lines: [{ id: "l1", description: "A", unit: "cuộn", quantity: 10, unit_price: 2000 }],
    } as unknown as QuoteWithLines;
    const input = toSaveInput(q.id, toEditorState(q));
    expect(saveDraftSchema.parse(input).lines[0]).toEqual({ description: "A", unit: "cuộn", quantity: 10, unitPrice: 2000 });
  });
});
