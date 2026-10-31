// Rule: only the customer (through the token flow / server code) can record a response.
// A manager or admin session cannot write the response fields, and cannot read or mint
// customer link tokens to answer on the customer's behalf.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createHash, randomBytes } from "node:crypto";
import { signInAs } from "../helpers/clients";
import { postJson } from "../helpers/http";
import { cleanupTestData, createSentQuote, getQuoteRow, getTokens, respondPath } from "../helpers/quotes";

describe.each(["manager", "admin"] as const)("quotes: %s cannot record a customer response", (role) => {
  let fx: Awaited<ReturnType<typeof createSentQuote>>;

  beforeAll(async () => {
    fx = await createSentQuote();
  });
  afterAll(cleanupTestData);

  it.each([
    ["status accepted", { status: "accepted" }],
    ["status changes_requested", { status: "changes_requested" }],
    ["responded_at", { responded_at: new Date().toISOString() }],
    ["customer_response_note", { customer_response_note: "khach dong y (gia mao)" }],
    ["all fields together", { status: "accepted", responded_at: new Date().toISOString(), customer_response_note: "x" }],
  ] as const)("PATCH quotes %s is rejected", async (_n, patch) => {
    const db = await signInAs(role);
    const { data, error } = await db.from("quotes").update(patch).eq("id", fx.quoteId).select("id");
    expect(error?.code ?? `no error, rows=${data?.length}`).toBe("42501");
    const row = await getQuoteRow(fx.quoteId);
    expect(row.status).toBe("sent");
    expect(row.responded_at).toBeNull();
    expect(row.customer_response_note).toBeNull();
  });

  it("cannot read quote_tokens", async () => {
    const db = await signInAs(role);
    const { data } = await db.from("quote_tokens").select("*").eq("quote_id", fx.quoteId);
    expect(data ?? []).toHaveLength(0);
  });

  it("cannot mint a customer link token and answer with it", async () => {
    const db = await signInAs(role);
    const raw = randomBytes(32).toString("base64url");
    const hash = createHash("sha256").update(raw).digest("hex");
    const { error } = await db
      .from("quote_tokens")
      .insert({ quote_id: fx.quoteId, token_hash: hash, expires_at: new Date(Date.now() + 86_400_000).toISOString() });
    expect(error).not.toBeNull();
    const r = await postJson(respondPath(raw), { action: "accept" });
    expect(r.status).toBe(404);
    expect(await getTokens(fx.quoteId)).toHaveLength(1);
  });

  it("cannot un-revoke or extend the customer's token", async () => {
    const db = await signInAs(role);
    await db.from("quote_tokens").update({ expires_at: "2099-01-01T00:00:00Z" }).eq("quote_id", fx.quoteId);
    const [tok] = await getTokens(fx.quoteId);
    expect(tok!.expires_at.startsWith("2099")).toBe(false);
  });

  it("quote is still unanswered", async () => {
    const row = await getQuoteRow(fx.quoteId);
    expect(row.status).toBe("sent");
  });
});
