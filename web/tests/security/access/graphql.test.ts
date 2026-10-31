// Rule: the GraphQL endpoint (pg_graphql, /graphql/v1) applies the same access rules as REST:
// anonymous sees no leads, staff2 sees none of another staff member's leads or quotes.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ANON_KEY, SUPABASE_URL } from "../helpers/env";
import { cleanupLeads, createLead, createQuote, fixtureActor } from "../helpers/lead-fixtures";
import { seedActor, type Actor } from "../helpers/sessions";

let owner: Actor;
let leadId: string;

async function gql(query: string, token?: string): Promise<{ status: number; body: Record<string, unknown> }> {
  const headers: Record<string, string> = { apikey: ANON_KEY, "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${SUPABASE_URL}/graphql/v1`, { method: "POST", headers, body: JSON.stringify({ query }) });
  return { status: res.status, body: (await res.json().catch(() => ({}))) as Record<string, unknown> };
}

const ids = (body: Record<string, unknown>, coll: string): string[] => {
  const data = body.data as Record<string, { edges?: Array<{ node: { id: string } }> }> | undefined;
  return data?.[coll]?.edges?.map((e) => e.node.id) ?? [];
};

beforeAll(async () => {
  owner = await fixtureActor("access-gql-owner", "staff");
  leadId = await createLead({ assignedTo: owner.id, tag: "graphql" });
  await createQuote(leadId);
});
afterAll(async () => cleanupLeads([leadId]));

describe("GraphQL respects lead access rules", () => {
  const LEADS = `{ leadsCollection(first: 100) { edges { node { id } } } }`;
  const QUOTES = `{ quotesCollection(first: 100) { edges { node { id leadId } } } }`;

  it("control: pg_graphql is disabled, or the assigned owner sees the lead", async () => {
    const l = await gql(LEADS, owner.token);
    const disabled = JSON.stringify(l.body).includes("pg_graphql extension is not enabled");
    if (!disabled) expect(ids(l.body, "leadsCollection")).toContain(leadId);
  });

  it("anonymous gets no leads or quotes", async () => {
    const l = await gql(LEADS);
    const q = await gql(QUOTES);
    expect(ids(l.body, "leadsCollection")).toEqual([]);
    expect(ids(q.body, "quotesCollection")).toEqual([]);
  });

  it("staff2 gets none of another staff member's leads", async () => {
    const s2 = await seedActor("staff2");
    const l = await gql(LEADS, s2.token);
    expect(ids(l.body, "leadsCollection")).not.toContain(leadId);
    const byId = await gql(`{ leadsCollection(filter: { id: { eq: "${leadId}" } }) { edges { node { id customerName phone } } } }`, s2.token);
    expect(ids(byId.body, "leadsCollection")).toEqual([]);
  });

  it("anonymous cannot insert a lead through a mutation", async () => {
    const m = await gql(
      `mutation { insertIntoLeadsCollection(objects: [{ customerName: "gql", phone: "0900000000", quantity: 1 }]) { affectedCount } }`,
    );
    const data = m.body.data as { insertIntoLeadsCollection?: { affectedCount: number } } | undefined;
    expect(data?.insertIntoLeadsCollection?.affectedCount ?? 0).toBe(0);
  });
});
