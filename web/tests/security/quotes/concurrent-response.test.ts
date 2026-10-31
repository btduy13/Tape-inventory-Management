// Rule: concurrent accept + request-changes on one link record exactly ONE response: one
// request succeeds, all others are refused, and the side effects (lead note, status) happen once.
import { afterAll, describe, expect, it } from "vitest";
import { serviceClient } from "../helpers/clients";
import { postJson } from "../helpers/http";
import { cleanupTestData, createSentQuote, getQuoteRow, getTokens, respondPath } from "../helpers/quotes";

describe("quotes: concurrent responses record exactly one answer", () => {
  afterAll(cleanupTestData);

  it.each([1, 2, 3])("round %i: 8 parallel mixed answers -> one 200, seven 409", async () => {
    const fx = await createSentQuote();
    const bodies = Array.from({ length: 8 }, (_, i) =>
      i % 2 === 0 ? { action: "accept" } : { action: "request_changes", note: `doi gia lan ${i}` },
    );
    const results = await Promise.all(bodies.map((b) => postJson(respondPath(fx.token), b)));

    const statuses = results.map((r) => r.status).sort();
    const winners = results.filter((r) => r.status === 200);
    expect(winners, `statuses ${statuses.join(",")}`).toHaveLength(1);
    expect(results.filter((r) => r.status === 409)).toHaveLength(7);

    const winner = winners[0]!.json as { result: string };
    const row = await getQuoteRow(fx.quoteId);
    expect(row.status).toBe(winner.result);
    expect(row.responded_at).not.toBeNull();

    const tokens = await getTokens(fx.quoteId);
    expect(tokens.filter((t) => t.revoked_at !== null)).toHaveLength(1);

    const { data: notes } = await serviceClient()
      .from("lead_notes")
      .select("id, body")
      .eq("lead_id", fx.lead.id);
    const responseNotes = (notes ?? []).filter((n) => /báo giá phiên bản/.test(n.body));
    expect(responseNotes.length).toBeLessThanOrEqual(1);
  });
});
