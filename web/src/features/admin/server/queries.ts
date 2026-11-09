// Admin read models (logged-in admin's RLS client).
import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Profile } from "@/lib/types";

type Db = SupabaseClient<Database>;

export type UserRow = Pick<Profile, "id" | "email" | "full_name" | "phone" | "role" | "is_active" | "created_at" | "nav_tabs" | "permissions">;

export async function listUsers(db: Db): Promise<UserRow[]> {
  const { data } = await db
    .from("profiles")
    .select("id, email, full_name, phone, role, is_active, created_at, nav_tabs, permissions")
    .order("is_active", { ascending: false })
    .order("created_at", { ascending: true });
  return data ?? [];
}

/** Same rows as listUsers, but reports a failed read so the page can show an error state. */
export async function loadUsers(db: Db): Promise<{ rows: UserRow[]; failed: boolean }> {
  const { data, error } = await db
    .from("profiles")
    .select("id, email, full_name, phone, role, is_active, created_at, nav_tabs, permissions")
    .order("created_at", { ascending: true });
  return { rows: data ?? [], failed: !!error };
}
