// /admin overview numbers: one RPC (0034 admin_overview, gate orders.view, cost side null without
// orders.money): attention counts, month KPIs, pipeline, 12-month chart, two short tables.
import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types";
import { toOverview, type Overview } from "../lib/overview";

export async function loadAdminOverview(db: SupabaseClient<Database>): Promise<Overview | null> {
  // shortcut: admin_overview is not in lib/types Database yet (file owned elsewhere); add it there, drop the cast.
  const { data, error } = await (db as unknown as SupabaseClient).rpc("admin_overview", { p_months: 12 });
  return error || !data ? null : toOverview(data as Record<string, unknown>);
}
