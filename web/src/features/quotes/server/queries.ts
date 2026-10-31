// Read queries as the logged-in user (RLS: staff see quotes of assigned leads only).
import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types";
import { createClient } from "@/lib/supabase/server";
import { normalizeLine, normalizeQuote, type QuoteLeadInfo, type QuoteWithLines } from "../lib/types";

type Db = SupabaseClient<Database>;

export const LEAD_INFO_COLUMNS = "id, code, customer_name, email, phone, company, status, assigned_to";

async function attachLines(db: Db, quotes: Database["public"]["Tables"]["quotes"]["Row"][]): Promise<QuoteWithLines[]> {
  if (quotes.length === 0) return [];
  const { data: lines, error } = await db
    .from("quote_lines")
    .select("*")
    .in("quote_id", quotes.map((q) => q.id))
    .order("sort_order", { ascending: true });
  if (error) throw new Error(`quote_lines read failed: ${error.message}`);
  return quotes.map((q) => ({
    ...normalizeQuote(q),
    lines: (lines ?? []).filter((l) => l.quote_id === q.id).map(normalizeLine),
  }));
}

/** All versions for a lead, newest first. */
export async function listQuotesForLead(leadId: string, db?: Db): Promise<QuoteWithLines[]> {
  const client = db ?? (await createClient());
  const { data, error } = await client
    .from("quotes")
    .select("*")
    .eq("lead_id", leadId)
    .order("version", { ascending: false });
  if (error) throw new Error(`quotes read failed: ${error.message}`);
  return attachLines(client, data ?? []);
}

export async function getQuoteWithLines(quoteId: string, db?: Db): Promise<QuoteWithLines | null> {
  const client = db ?? (await createClient());
  const { data, error } = await client.from("quotes").select("*").eq("id", quoteId).maybeSingle();
  if (error) throw new Error(`quote read failed: ${error.message}`);
  if (!data) return null;
  const [q] = await attachLines(client, [data]);
  return q ?? null;
}

export async function getLeadInfo(leadId: string, db: Db): Promise<QuoteLeadInfo | null> {
  const { data, error } = await db.from("leads").select(LEAD_INFO_COLUMNS).eq("id", leadId).maybeSingle();
  if (error) throw new Error(`lead read failed: ${error.message}`);
  return (data as QuoteLeadInfo | null) ?? null;
}
