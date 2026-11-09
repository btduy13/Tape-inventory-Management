// Reads of /admin/bao-gia: admin_quotes_list (0032) and admin_order_get, both orders.view in SQL
// (money hidden without orders.money). Always the logged-in user's client.
import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types";
import type { QuoteRow } from "../lib/stored";

type Db = SupabaseClient<Database>;
// shortcut: 0032 RPCs are not in database.generated.ts yet (no local stack to regenerate); type them once it is.
// Called as a method (db.rpc reads `this.rest`): a detached db.rpc throws on every call.
export const rpc = (db: Db) => (fn: string, args: Record<string, unknown>) =>
  (db as unknown as SupabaseClient).rpc(fn, args) as PromiseLike<{ data: unknown; error: { code?: string } | null }>;

export type ListedQuote = { type: string; quote: QuoteRow };
export type QuotesFilter = { type: string; q: string; from: string | null; to: string | null };

export async function listQuotes(db: Db, f: QuotesFilter): Promise<ListedQuote[] | null> {
  const { data, error } = await rpc(db)("admin_quotes_list", {
    p_type: f.type, ...(f.q ? { p_q: f.q } : {}), ...(f.from ? { p_date_from: f.from } : {}), ...(f.to ? { p_date_to: f.to } : {}),
  });
  if (error || !Array.isArray(data)) return null;
  return (data as ListedQuote[]).sort((a, b) => String(b.quote.thoi_gian ?? "").localeCompare(String(a.quote.thoi_gian ?? "")));
}

/** One quote row (to_jsonb), null when missing or already an order. */
export async function getQuote(db: Db, type: string, id: string): Promise<QuoteRow | null> {
  const { data, error } = await rpc(db)("admin_order_get", { p_id: id, p_type: type });
  const order = (data as { order?: QuoteRow } | null)?.order;
  return error || !order || order.is_quote !== true ? null : order;
}
