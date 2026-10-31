// Rule: a customer link answers the quote once. Replays (same or other action) are refused,
// the recorded answer never changes, and once the link expires the page shows no data.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
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
} from "../helpers/quotes";

describe("quotes: a used token cannot be used again", () => {
  let fx: Awaited<ReturnType<typeof createSentQuote>>;

  beforeAll(async () => {
    fx = await createSentQuote();
  });
  afterAll(cleanupTestData);

  it("first answer is recorded, every replay is refused with 409 and changes nothing", async () => {
    const first = await postJson(respondPath(fx.token), { action: "accept", note: "dong y" });
    expect(first.status).toBe(200);
    expect(first.json).toEqual({ ok: true, result: "accepted" });
    const after = await getQuoteRow(fx.quoteId);
    expect(after.status).toBe("accepted");

    for (const body of [
      { action: "accept" },
      { action: "accept", note: "lan hai" },
      { action: "request_changes", note: "doi gia giup toi" },
    ]) {
      const r = await postJson(respondPath(fx.token), body);
      expect.soft(r.status, JSON.stringify(body)).toBe(409);
      expect.soft(r.json, JSON.stringify(body)).toEqual({ ok: false, error: "already_used" });
    }
    const row = await getQuoteRow(fx.quoteId);
    expect(row.status).toBe("accepted");
    expect(row.customer_response_note).toBe("dong y");
    expect(row.responded_at).toBe(after.responded_at);
    const tokens = await getTokens(fx.quoteId);
    expect(tokens).toHaveLength(1);
    expect(tokens[0]!.revoked_at).not.toBeNull();
  });

  it("the used link is read-only: no respond form", async () => {
    const page = await getPage(pagePath(fx.token));
    expect(page.status).toBe(200);
    expect(mainText(page.html)).toContain("Bạn đã phản hồi báo giá này");
    expect(page.html).not.toMatch(/name="note"/);
  });

  it("after the used link expires, the page shows no names or prices (W5)", async () => {
    await setTokenExpiry(fx.quoteId, new Date(Date.now() - 60_000).toISOString());
    const page = await getPage(pagePath(fx.token));
    expect(mainText(page.html)).toBe("Liên kết báo giá đã hết hạn hoặc không hợp lệ.");
    for (const s of sensitiveStrings(fx.lead)) expect.soft(page.html, `leaks ${s}`).not.toContain(s);
    const r = await postJson(respondPath(fx.token), { action: "accept" });
    expect(r.status).toBe(404);
  });
});
