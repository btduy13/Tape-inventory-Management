// Rule: an expired customer link (token expires_at) or an expired quote (valid_until) cannot
// be used to answer; an expired link shows no quote data; links never outlive the TTL.
import { afterAll, describe, expect, it } from "vitest";
import { getPage, mainText, postJson } from "../helpers/http";
import {
  cleanupTestData,
  createSentQuote,
  getQuoteRow,
  getTokens,
  pagePath,
  respondPath,
  sensitiveStrings,
  setTokenExpiry,
  setValidUntil,
} from "../helpers/quotes";

const DAY = 24 * 60 * 60 * 1000;

describe("quotes: expired tokens are refused", () => {
  afterAll(cleanupTestData);

  it("a freshly issued link expires within QUOTE_TOKEN_TTL_DAYS (max 90)", async () => {
    const fx = await createSentQuote();
    const ttl = Number(process.env.QUOTE_TOKEN_TTL_DAYS ?? 14);
    const exp = Date.parse(fx.expiresAt);
    expect(exp).toBeGreaterThan(Date.now());
    expect(exp).toBeLessThanOrEqual(Date.now() + Math.min(ttl, 90) * DAY + 60_000);
    const [tok] = await getTokens(fx.quoteId);
    expect(Date.parse(tok!.expires_at)).toBe(exp);
  });

  it("link past expires_at: API 404 invalid_token, page shows no data, quote stays sent", async () => {
    const fx = await createSentQuote();
    await setTokenExpiry(fx.quoteId, new Date(Date.now() - 1000).toISOString());

    for (const body of [{ action: "accept" }, { action: "request_changes", note: "het han roi" }]) {
      const r = await postJson(respondPath(fx.token), body);
      expect.soft(r.status, body.action).toBe(404);
      expect.soft(r.json, body.action).toEqual({ ok: false, error: "invalid_token" });
    }
    const page = await getPage(pagePath(fx.token));
    expect(mainText(page.html)).toBe("Liên kết báo giá đã hết hạn hoặc không hợp lệ.");
    for (const s of sensitiveStrings(fx.lead)) expect.soft(page.html, `leaks ${s}`).not.toContain(s);

    const row = await getQuoteRow(fx.quoteId);
    expect(row.status).toBe("sent");
    expect(row.responded_at).toBeNull();
  });

  it("quote past valid_until: accept refused with 410, quote stays sent, no respond form", async () => {
    const fx = await createSentQuote();
    await setValidUntil(fx.quoteId, "2020-01-01");

    const r = await postJson(respondPath(fx.token), { action: "accept" });
    expect(r.status).toBe(410);
    expect(r.json).toEqual({ ok: false, error: "quote_expired" });
    const page = await getPage(pagePath(fx.token));
    expect(page.html).not.toMatch(/name="note"/);

    const row = await getQuoteRow(fx.quoteId);
    expect(row.status).toBe("sent");
    const [tok] = await getTokens(fx.quoteId);
    expect(tok!.revoked_at).toBeNull();
  });
});
