// Rule: once a quote is sent, the terms the customer sees and accepts are frozen like the
// prices (0012: "changes need a new version"). Notes and validity date are shown on /q/<token>
// next to the prices; pdf_path / sent_at are the audit record of what was sent. A manager or
// admin must not change them on a sent or accepted quote.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { signInAs } from "../helpers/clients";
import { getPage, mainText, postJson } from "../helpers/http";
import { cleanupTestData, createSentQuote, getQuoteRow, pagePath, respondPath } from "../helpers/quotes";

const PATCHES = [
  ["notes", { notes: "Gia chua gom phi van chuyen 2.000.000 d" }],
  ["valid_until", { valid_until: "2099-12-31" }],
  ["pdf_path", { pdf_path: "00000000-0000-0000-0000-000000000000/other.pdf" }],
  ["sent_at", { sent_at: "2020-01-01T00:00:00Z" }],
] as const;

describe.each(["manager", "admin"] as const)("quotes: %s cannot change sent quote terms", (role) => {
  let sent: Awaited<ReturnType<typeof createSentQuote>>;
  let accepted: Awaited<ReturnType<typeof createSentQuote>>;

  beforeAll(async () => {
    sent = await createSentQuote();
    accepted = await createSentQuote();
    const r = await postJson(respondPath(accepted.token), { action: "accept" });
    if (r.status !== 200) throw new Error(`setup accept failed: ${r.status} ${r.text}`);
  });
  afterAll(cleanupTestData);

  it.each(PATCHES)("sent quote: PATCH %s is rejected", async (_n, patch) => {
    const db = await signInAs(role);
    const before = await getQuoteRow(sent.quoteId);
    const { data, error } = await db.from("quotes").update(patch).eq("id", sent.quoteId).select("id");
    expect(error?.code ?? `accepted, rows=${data?.length}`).toBe("42501");
    const after = await getQuoteRow(sent.quoteId);
    const key = Object.keys(patch)[0] as keyof typeof after;
    expect(after[key]).toEqual(before[key]);
  });

  it.each(PATCHES)("accepted quote: PATCH %s is rejected", async (_n, patch) => {
    const db = await signInAs(role);
    const before = await getQuoteRow(accepted.quoteId);
    const { data, error } = await db.from("quotes").update(patch).eq("id", accepted.quoteId).select("id");
    expect(error?.code ?? `accepted, rows=${data?.length}`).toBe("42501");
    const after = await getQuoteRow(accepted.quoteId);
    const key = Object.keys(patch)[0] as keyof typeof after;
    expect(after[key]).toEqual(before[key]);
  });

  it("customer page does not show notes written after sending", async () => {
    const page = await getPage(pagePath(sent.token));
    expect(mainText(page.html)).not.toContain("phi van chuyen 2.000.000");
  });
});
