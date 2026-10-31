// Rule: prices cannot change once a quote is sent. Lines, VAT, currency and totals are locked
// for every non-server caller (manager AND admin), the quote cannot go back to draft, and
// the customer link keeps showing the prices that were sent.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { signInAs } from "../helpers/clients";
import { getPage } from "../helpers/http";
import {
  cleanupTestData,
  createDraftQuote,
  createSentQuote,
  createTestLead,
  getLines,
  getQuoteRow,
  pagePath,
} from "../helpers/quotes";

describe.each(["manager", "admin"] as const)("quotes: %s cannot change prices after sending", (role) => {
  let fx: Awaited<ReturnType<typeof createSentQuote>>;
  let before: { total: number; subtotal: number; vat: number; lines: string };
  let otherDraftId: string;

  const snapshot = async () => {
    const q = await getQuoteRow(fx.quoteId);
    const lines = await getLines(fx.quoteId);
    return {
      total: Number(q.total),
      subtotal: Number(q.subtotal),
      vat: Number(q.vat_percent),
      lines: JSON.stringify(lines.map((l) => [l.id, l.description, Number(l.quantity), Number(l.unit_price)])),
    };
  };

  beforeAll(async () => {
    fx = await createSentQuote();
    before = await snapshot();
    const other = await createTestLead();
    otherDraftId = await createDraftQuote(other.id);
  });
  afterAll(cleanupTestData);

  const expectUnchanged = async () => {
    expect(await snapshot()).toEqual(before);
  };

  it("UPDATE quote_lines unit_price / quantity is rejected", async () => {
    const db = await signInAs(role);
    const [line] = await getLines(fx.quoteId);
    for (const patch of [{ unit_price: 1 }, { quantity: 1 }, { description: "doi ten" }]) {
      const { error } = await db.from("quote_lines").update(patch).eq("id", line!.id);
      expect.soft(error?.code, JSON.stringify(patch)).toBe("42501");
    }
    await expectUnchanged();
  });

  it("INSERT and DELETE of lines are rejected", async () => {
    const db = await signInAs(role);
    const ins = await db
      .from("quote_lines")
      .insert({ quote_id: fx.quoteId, description: "phi them", unit: "cuon", quantity: 1, unit_price: 999_999 });
    expect(ins.error?.code).toBe("42501");
    const [line] = await getLines(fx.quoteId);
    const del = await db.from("quote_lines").delete().eq("id", line!.id);
    expect(del.error?.code).toBe("42501");
    await expectUnchanged();
  });

  it("moving a line out of / into the sent quote is rejected", async () => {
    const db = await signInAs(role);
    const [line] = await getLines(fx.quoteId);
    const out = await db.from("quote_lines").update({ quote_id: otherDraftId }).eq("id", line!.id);
    expect(out.error?.code).toBe("42501");
    const [draftLine] = await getLines(otherDraftId);
    const into = await db.from("quote_lines").update({ quote_id: fx.quoteId }).eq("id", draftLine!.id);
    expect(into.error?.code).toBe("42501");
    await expectUnchanged();
  });

  it("VAT, currency and direct total edits are rejected or overridden", async () => {
    const db = await signInAs(role);
    expect((await db.from("quotes").update({ vat_percent: 0 }).eq("id", fx.quoteId)).error?.code).toBe("42501");
    expect((await db.from("quotes").update({ currency: "USD" }).eq("id", fx.quoteId)).error?.code).toBe("42501");
    await db.from("quotes").update({ total: 1, subtotal: 1, vat_amount: 0 }).eq("id", fx.quoteId);
    await expectUnchanged();
    expect((await getQuoteRow(fx.quoteId)).currency).toBe("VND");
  });

  it("sent quote cannot go back to draft (edit-and-resend path)", async () => {
    const db = await signInAs(role);
    const { error } = await db.from("quotes").update({ status: "draft" }).eq("id", fx.quoteId);
    expect(error?.code).toBe("42501");
    expect((await getQuoteRow(fx.quoteId)).status).toBe("sent");
  });

  it("customer link still shows the sent total", async () => {
    const page = await getPage(pagePath(fx.token));
    expect(page.status).toBe(200);
    const formatted = new Intl.NumberFormat("vi-VN").format(before.total);
    expect(page.html).toContain(formatted);
  });
});
