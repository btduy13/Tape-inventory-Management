// Service-role lookup of a quote by raw customer token (sha256 match; raw token never stored).
import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { LeadStatus, Quote, QuoteLine, QuoteToken } from "@/lib/types";
import { tokenSchema } from "../lib/schemas";
import { hashQuoteToken } from "../lib/token";
import { normalizeLine, normalizeQuote } from "../lib/types";

export interface TokenBundle {
  token: Pick<QuoteToken, "id" | "quote_id" | "expires_at" | "revoked_at">;
  quote: Quote;
  lines: QuoteLine[];
  lead: {
    id: string;
    code: string;
    customer_name: string;
    company: string | null;
    status: LeadStatus;
    assigned_to: string | null;
  };
}

/** Null for malformed or unknown tokens. Does NOT judge expiry (see evaluateTokenAccess). */
export async function findByRawToken(rawToken: string): Promise<TokenBundle | null> {
  if (!tokenSchema.safeParse(rawToken).success) return null;
  const db = createAdminClient();
  const hash = await hashQuoteToken(rawToken);

  const { data: token } = await db
    .from("quote_tokens")
    .select("id, quote_id, expires_at, revoked_at")
    .eq("token_hash", hash)
    .maybeSingle();
  if (!token) return null;

  const { data: quote } = await db.from("quotes").select("*").eq("id", token.quote_id).maybeSingle();
  if (!quote) return null;

  const [{ data: lines }, { data: lead }] = await Promise.all([
    db.from("quote_lines").select("*").eq("quote_id", quote.id).order("sort_order", { ascending: true }),
    db
      .from("leads")
      .select("id, code, customer_name, company, status, assigned_to")
      .eq("id", quote.lead_id)
      .maybeSingle(),
  ]);
  if (!lead) return null;
  return { token, quote: normalizeQuote(quote), lines: (lines ?? []).map(normalizeLine), lead };
}
