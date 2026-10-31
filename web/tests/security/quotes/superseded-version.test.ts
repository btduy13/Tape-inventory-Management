// Rule: only the newest link of the newest sent version can answer. After v2 is sent (or v1
// is re-sent) the older link is refused like an unknown token and shows no prices (W6).
import { afterAll, describe, expect, it } from "vitest";
import { getPage, mainText, postJson } from "../helpers/http";
import {
  cleanupTestData,
  createDraftQuote,
  createSentQuote,
  getQuoteRow,
  pagePath,
  respondPath,
  sendAsManager,
  sensitiveStrings,
} from "../helpers/quotes";

const LINK_INVALID = "Liên kết báo giá đã hết hạn hoặc không hợp lệ.";

describe("quotes: after v2 is sent the v1 token is refused", () => {
  afterAll(cleanupTestData);

  it("v1 link: API 404, page has no data; v1 cancelled; v2 link works", async () => {
    const v1 = await createSentQuote();
    const v2Id = await createDraftQuote(v1.lead.id, {
      version: 2,
      lines: [{ description: "Bang keo v2", quantity: 100, unitPrice: 9_000 }],
    });
    const v2 = await sendAsManager(v2Id);

    for (const body of [{ action: "accept" }, { action: "request_changes", note: "ban cu" }]) {
      const r = await postJson(respondPath(v1.token), body);
      expect.soft(r.status, body.action).toBe(404);
      expect.soft(r.json, body.action).toEqual({ ok: false, error: "invalid_token" });
    }
    const page = await getPage(pagePath(v1.token));
    expect(mainText(page.html)).toBe(LINK_INVALID);
    for (const s of sensitiveStrings(v1.lead)) expect.soft(page.html, `leaks ${s}`).not.toContain(s);

    expect((await getQuoteRow(v1.quoteId)).status).toBe("cancelled");
    expect((await getQuoteRow(v2Id)).status).toBe("sent");

    const ok = await postJson(respondPath(v2.token), { action: "accept" });
    expect(ok.status).toBe(200);
    expect((await getQuoteRow(v1.quoteId)).status).toBe("cancelled");
  });

  it("re-sending the same quote revokes the previous link", async () => {
    const first = await createSentQuote();
    const second = await sendAsManager(first.quoteId);
    const old = await postJson(respondPath(first.token), { action: "accept" });
    expect(old.status).toBe(404);
    expect((await getQuoteRow(first.quoteId)).status).toBe("sent");
    const ok = await postJson(respondPath(second.token), { action: "accept" });
    expect(ok.status).toBe(200);
  });
});
