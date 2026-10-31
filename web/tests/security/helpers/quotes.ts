// Quote fixtures for the security suite.
// Leads are created with the service key (the public intake needs Turnstile); quotes and
// lines are created by the MANAGER through RLS, and sending runs the app's real send flow
// (sendQuote + createSendDeps with the manager session: token insert, revoke of older
// links, mark sent, supersede older versions). Only the PDF render and the email transport
// are replaced; the raw customer token is captured from the email call.
import { randomBytes } from "node:crypto";
import { sendQuote } from "@/features/quotes/server/send-quote";
import { createSendDeps } from "@/features/quotes/server/send-deps";
import { serviceClient, signInAs, type Db } from "./clients";

export const TEST_TAG = "SECTEST-quotes";

export interface TestLead {
  id: string;
  code: string;
  customerName: string;
  email: string;
}

const createdLeads = new Set<string>();

export async function createTestLead(): Promise<TestLead> {
  const tag = randomBytes(4).toString("hex");
  const customerName = `${TEST_TAG} Khach ${tag}`;
  const email = `sectest-${tag}@local.test`;
  const { data, error } = await serviceClient()
    .from("leads")
    .insert({ customer_name: customerName, phone: "0900000000", email, quantity: 100, company: `Cty ${tag}` })
    .select("id, code")
    .single();
  if (error || !data) throw new Error(`createTestLead: ${error?.message}`);
  createdLeads.add(data.id);
  return { id: data.id, code: data.code, customerName, email };
}

export interface LineSpec {
  description: string;
  quantity: number;
  unitPrice: number;
}

export const DEFAULT_LINES: LineSpec[] = [
  { description: "Bang keo in logo 48mm", quantity: 100, unitPrice: 12_345 },
  { description: "Phi in khuon", quantity: 1, unitPrice: 500_000 },
];

/** Draft quote created by the manager (RLS path), with lines. */
export async function createDraftQuote(
  leadId: string,
  opts: { version?: number; lines?: LineSpec[]; vatPercent?: number; actor?: Db } = {},
): Promise<string> {
  const db = opts.actor ?? (await signInAs("manager"));
  const { data: quote, error } = await db
    .from("quotes")
    .insert({ lead_id: leadId, version: opts.version ?? 1, vat_percent: opts.vatPercent ?? 10 })
    .select("id")
    .single();
  if (error || !quote) throw new Error(`createDraftQuote: ${error?.message}`);
  const lines = (opts.lines ?? DEFAULT_LINES).map((l, i) => ({
    quote_id: quote.id,
    sort_order: i,
    description: l.description,
    unit: "cuon",
    quantity: l.quantity,
    unit_price: l.unitPrice,
  }));
  const { error: lineErr } = await db.from("quote_lines").insert(lines);
  if (lineErr) throw new Error(`createDraftQuote lines: ${lineErr.message}`);
  return quote.id;
}

/** Sends the quote through the app's real send flow as the manager. Returns the raw token. */
export async function sendAsManager(quoteId: string): Promise<{ token: string; expiresAt: string }> {
  const db = await signInAs("manager");
  let captured: { token: string; expiresAt: string } | null = null;
  const deps = {
    ...createSendDeps(db),
    renderPdf: async () => new TextEncoder().encode("%PDF-1.4\n% security suite stub\n%%EOF\n"),
    sendEmail: async ({ token, expiresAt }: { token: string; expiresAt: string }) => {
      captured = { token, expiresAt };
      return { ok: true };
    },
  };
  const res = await sendQuote(deps, quoteId);
  if (!res.ok) throw new Error(`sendAsManager: ${res.error}`);
  if (!captured) throw new Error("sendAsManager: no token captured");
  return captured;
}

/** Lead + draft v1 + sent. */
export async function createSentQuote(opts: { lines?: LineSpec[] } = {}) {
  const lead = await createTestLead();
  const quoteId = await createDraftQuote(lead.id, { lines: opts.lines });
  const { token, expiresAt } = await sendAsManager(quoteId);
  return { lead, quoteId, token, expiresAt };
}

export async function getQuoteRow(quoteId: string) {
  const { data, error } = await serviceClient().from("quotes").select("*").eq("id", quoteId).single();
  if (error || !data) throw new Error(`getQuoteRow: ${error?.message}`);
  return data;
}

export async function getLines(quoteId: string) {
  const { data, error } = await serviceClient()
    .from("quote_lines")
    .select("*")
    .eq("quote_id", quoteId)
    .order("sort_order");
  if (error) throw new Error(`getLines: ${error.message}`);
  return data ?? [];
}

export async function getTokens(quoteId: string) {
  const { data, error } = await serviceClient()
    .from("quote_tokens")
    .select("id, expires_at, revoked_at, last_used_at, created_at")
    .eq("quote_id", quoteId)
    .order("created_at");
  if (error) throw new Error(`getTokens: ${error.message}`);
  return data ?? [];
}

/** Service-side test manipulation (simulates time passing). */
export async function setTokenExpiry(quoteId: string, iso: string) {
  const { error } = await serviceClient().from("quote_tokens").update({ expires_at: iso }).eq("quote_id", quoteId);
  if (error) throw new Error(`setTokenExpiry: ${error.message}`);
}

export async function setValidUntil(quoteId: string, date: string) {
  const { error } = await serviceClient().from("quotes").update({ valid_until: date }).eq("id", quoteId);
  if (error) throw new Error(`setValidUntil: ${error.message}`);
}

export const respondPath = (token: string) => `/api/q/${encodeURIComponent(token)}/respond`;
export const pagePath = (token: string) => `/q/${encodeURIComponent(token)}`;

/** Well-formed (tokenSchema) but random token that was never issued. */
export const randomRawToken = () => randomBytes(32).toString("base64url");

/** Removes every lead (and by cascade quotes/lines/tokens) this test file created. */
export async function cleanupTestData() {
  const ids = [...createdLeads];
  createdLeads.clear();
  if (ids.length === 0) return;
  const db = serviceClient();
  const { data: quotes } = await db.from("quotes").select("id, lead_id").in("lead_id", ids);
  if (quotes?.length) {
    await db.storage.from("quotes").remove(quotes.map((q) => `${q.lead_id}/${q.id}.pdf`));
  }
  await db.from("leads").delete().in("id", ids);
}

/** Strings that must never appear on an invalid/expired quote page. */
export function sensitiveStrings(lead: TestLead): string[] {
  return [lead.customerName, lead.code, "12.345", "12,345", "500.000", DEFAULT_LINES[0]!.description];
}
