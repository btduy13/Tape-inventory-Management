// "Chuyển sang sản xuất": only through the convert_lead_to_production RPC (admin check in SQL,
// idempotent, writes the legacy bang_keo_in_orders row). Never insert into legacy tables here.
import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types";

type Db = SupabaseClient<Database>;

export type ConvertResult =
  | { ok: true; orderId: string }
  | { ok: false; reason: "forbidden" | "notFound" | "notReady" | "generic" };

export async function convertLeadToProduction(db: Db, leadId: string): Promise<ConvertResult> {
  const { data, error } = await db.rpc("convert_lead_to_production", { p_lead_id: leadId });
  if (error) {
    if (error.code === "42501") return { ok: false, reason: "forbidden" };
    if (error.code === "P0002") return { ok: false, reason: "notFound" };
    // 22023: lead not accepted yet, or no design.
    if (error.code === "22023") return { ok: false, reason: "notReady" };
    return { ok: false, reason: "generic" };
  }
  return typeof data === "string" && data ? { ok: true, orderId: data } : { ok: false, reason: "generic" };
}
