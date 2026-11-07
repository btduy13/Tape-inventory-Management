// /admin KPI numbers: one admin-only RPC (0029 admin_dashboard), same sums as the app's Tổng quan tab.
import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types";
import { toDashboard, type AdminDashboard } from "../lib/dashboard";

export async function loadAdminDashboard(db: SupabaseClient<Database>): Promise<AdminDashboard | null> {
  const { data, error } = await db.rpc("admin_dashboard");
  return error || !data ? null : toDashboard(data);
}
