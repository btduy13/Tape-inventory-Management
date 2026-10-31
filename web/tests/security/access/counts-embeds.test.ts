// Rule: row counts and embedded relations never reveal rows hidden by RLS.
import { randomBytes } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { addNote, cleanupLeads, createLead, createQuote, fixtureActor, looseService } from "../helpers/lead-fixtures";
import { seedActor, type Actor } from "../helpers/sessions";

let owner: Actor;
let outsider: Actor;
let leadId: string;
let quoteId: string;

beforeAll(async () => {
  owner = await fixtureActor("access-cnt-owner", "staff");
  outsider = await seedActor("staff2");
  leadId = await createLead({ assignedTo: owner.id, tag: "counts" });
  ({ quoteId } = await createQuote(leadId));
  await addNote(leadId);
});
afterAll(async () => cleanupLeads([leadId]));

describe("exact counts do not reveal hidden rows", () => {
  const cases: Array<[string, string, () => string]> = [
    ["leads", "id", () => leadId],
    ["designs", "lead_id", () => leadId],
    ["quotes", "lead_id", () => leadId],
    ["lead_status_log", "lead_id", () => leadId],
    ["lead_notes", "lead_id", () => leadId],
    ["quote_lines", "quote_id", () => quoteId],
  ];
  for (const [table, col, val] of cases) {
    it(`${table}: outsider count for another staff's lead is 0`, async () => {
      const { count, error } = await outsider.db.from(table).select("*", { count: "exact", head: true }).eq(col, val());
      expect(error).toBeNull();
      expect(count).toBe(0);
    });
  }

  it("outsider total lead count equals the number of rows it can read", async () => {
    const head = await outsider.db.from("leads").select("*", { count: "exact", head: true });
    const rows = await outsider.db.from("leads").select("id");
    expect(head.count).toBe((rows.data ?? []).length);
  });
});

describe("embedded relations do not reveal hidden rows", () => {
  it("outsider: designs?select=*,leads(*) returns nothing for the hidden lead", async () => {
    const { data } = await outsider.db.from("designs").select("*, leads(*)").eq("lead_id", leadId);
    expect(data ?? []).toEqual([]);
  });

  it("outsider: quote_lines?select=*,quotes(*) returns nothing for the hidden quote", async () => {
    const { data } = await outsider.db.from("quote_lines").select("*, quotes(*)").eq("quote_id", quoteId);
    expect(data ?? []).toEqual([]);
  });

  it("outsider: own profile embed of leads (leads!assigned_to) shows none of the hidden lead", async () => {
    const { data } = await outsider.db.from("profiles").select("id, leads!leads_assigned_to_fkey(id)");
    const embedded = (data ?? []).flatMap((p: { leads?: Array<{ id: string }> }) => p.leads ?? []);
    expect(embedded.map((l) => l.id)).not.toContain(leadId);
  });

  it("owner: lead embed of lead_assignments (manager-only history) is empty", async () => {
    const { data, error } = await owner.db.from("leads").select("id, lead_assignments(*)").eq("id", leadId).single();
    expect(error).toBeNull();
    expect(data?.lead_assignments ?? []).toEqual([]);
  });

  it("owner: lead embed of the assignee profile shows only the owner's own profile", async () => {
    const { data } = await owner.db.from("profiles").select("id");
    expect((data ?? []).map((p) => p.id)).toEqual([owner.id]);
  });

  it("owner: quote embed of quote_tokens returns no token rows", async () => {
    // seed a token so there is something to hide
    const svc = looseService();
    await svc.from("quote_tokens").insert({
      quote_id: quoteId,
      token_hash: randomBytes(32).toString("hex"),
      expires_at: new Date(Date.now() + 86_400_000).toISOString(),
    });
    const { data, error } = await owner.db.from("quotes").select("id, quote_tokens(*)").eq("id", quoteId);
    const tokens = error ? [] : (data ?? []).flatMap((q: { quote_tokens?: unknown[] }) => q.quote_tokens ?? []);
    expect(tokens).toEqual([]);
    await svc.from("quote_tokens").delete().eq("quote_id", quoteId);
  });

  it("outsider: profiles list does not expose other staff accounts", async () => {
    const { data } = await outsider.db.from("profiles").select("id");
    expect((data ?? []).map((p) => p.id)).toEqual([outsider.id]);
  });
});
