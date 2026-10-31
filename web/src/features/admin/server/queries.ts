// Admin read models (logged-in admin's RLS client).
import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, LeadStatus, Profile } from "@/lib/types";
import { LEAD_STATUSES } from "@/lib/types";

type Db = SupabaseClient<Database>;

export type UserRow = Pick<Profile, "id" | "email" | "full_name" | "phone" | "role" | "is_active" | "created_at">;

export async function listUsers(db: Db): Promise<UserRow[]> {
  const { data } = await db
    .from("profiles")
    .select("id, email, full_name, phone, role, is_active, created_at")
    .order("is_active", { ascending: false })
    .order("created_at", { ascending: true });
  return data ?? [];
}

export type StatusCounts = Record<LeadStatus, number>;

export function countByStatus(rows: readonly { status: LeadStatus }[]): StatusCounts {
  const counts = Object.fromEntries(LEAD_STATUSES.map((s) => [s, 0])) as StatusCounts;
  for (const r of rows) counts[r.status] += 1;
  return counts;
}

/** Status counts over the most recent leads (bounded; dashboard summary only). */
export async function leadStatusCounts(db: Db, limit = 5000): Promise<StatusCounts> {
  const { data } = await db.from("leads").select("status").order("created_at", { ascending: false }).limit(limit);
  return countByStatus(data ?? []);
}
