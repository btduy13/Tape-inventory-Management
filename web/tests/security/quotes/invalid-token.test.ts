// Rule: an unknown, malformed, revoked or withdrawn token gets ONE uniform response that
// reveals nothing (no quote data, no hint which case it was), on the page and the API.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getPage, mainText, postJson } from "../helpers/http";
import { serviceClient } from "../helpers/clients";
import {
  cleanupTestData,
  createSentQuote,
  pagePath,
  randomRawToken,
  respondPath,
  sensitiveStrings,
  type TestLead,
} from "../helpers/quotes";

const LINK_INVALID = "Liên kết báo giá đã hết hạn hoặc không hợp lệ.";

describe("quotes: invalid tokens get a uniform, data-free response", () => {
  let revokedToken: string;
  let cancelledToken: string;
  let leads: TestLead[] = [];

  beforeAll(async () => {
    const a = await createSentQuote();
    await serviceClient().from("quote_tokens").update({ revoked_at: new Date().toISOString() }).eq("quote_id", a.quoteId);
    revokedToken = a.token;
    const b = await createSentQuote();
    await serviceClient().from("quotes").update({ status: "cancelled" }).eq("id", b.quoteId);
    cancelledToken = b.token;
    leads = [a.lead, b.lead];
  });
  afterAll(cleanupTestData);

  const variants = (): Record<string, string> => ({
    randomWellFormed: randomRawToken(),
    randomWellFormed2: randomRawToken(),
    tooShort: "abc",
    tooLong: "A".repeat(200),
    badChars: "%27%20OR%201%3D1--aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    pathTrick: "..%2F..%2Fapi%2Fleads",
    revokedUnanswered: revokedToken,
    quoteCancelled: cancelledToken,
  });

  it("POST /api/q/<token>/respond returns the identical 404 body for every invalid token", async () => {
    const results: Record<string, { status: number; text: string }> = {};
    for (const [name, tok] of Object.entries(variants())) {
      const path = name === "badChars" || name === "pathTrick" ? `/api/q/${tok}/respond` : respondPath(tok);
      const r = await postJson(path, { action: "accept" });
      results[name] = { status: r.status, text: r.text };
    }
    for (const [name, r] of Object.entries(results)) {
      expect.soft(r, name).toEqual({ status: 404, text: JSON.stringify({ ok: false, error: "invalid_token" }) });
    }
  });

  it("GET /q/<token> shows only the generic 'link invalid' message, no quote data", async () => {
    const texts = new Set<string>();
    const statuses = new Set<number>();
    for (const [name, tok] of Object.entries(variants())) {
      const path = name === "badChars" || name === "pathTrick" ? `/q/${tok}` : pagePath(tok);
      const page = await getPage(path);
      statuses.add(page.status);
      const text = mainText(page.html);
      texts.add(text);
      expect.soft(text, name).toBe(LINK_INVALID);
      for (const lead of leads) {
        for (const s of sensitiveStrings(lead)) expect.soft(page.html, `${name} leaks ${s}`).not.toContain(s);
      }
      expect.soft(page.html, `${name} must not render the respond form`).not.toMatch(/name="note"|request_changes/);
    }
    expect(statuses.size, `statuses: ${[...statuses].join(",")}`).toBe(1);
    expect(texts.size).toBe(1);
  });

  it("invalid-token responses are not cacheable and the page is noindex/no-referrer", async () => {
    const api = await postJson(respondPath(randomRawToken()), { action: "accept" });
    expect(api.headers.get("cache-control") ?? "").toMatch(/no-store/);
    const page = await getPage(pagePath(randomRawToken()));
    expect(page.html).toMatch(/<meta name="robots" content="noindex, nofollow"/);
    expect(page.html).toMatch(/<meta name="referrer" content="no-referrer"/);
  });
});
