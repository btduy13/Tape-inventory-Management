import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AppRole, Database, Profile } from "@/lib/types";

type Db = SupabaseClient<Database>;

export type Assignee = Pick<Profile, "id" | "full_name" | "email" | "role">;

/** Roles offered in the picker (assign_lead accepts any active internal user). */
export const ASSIGNABLE_ROLES: readonly AppRole[] = ["staff", "ctv", "manager", "admin"];

/** Active internal users, field roles first. Admin-only data (profiles RLS). */
export async function listAssignees(db: Db): Promise<Assignee[]> {
  const { data, error } = await db
    .from("profiles")
    .select("id, full_name, email, role")
    .eq("is_active", true)
    .in("role", [...ASSIGNABLE_ROLES])
    .order("full_name", { ascending: true });
  if (error) return [];
  return sortAssignees(data ?? []);
}

export function sortAssignees(list: Assignee[]): Assignee[] {
  const rank = (r: AppRole) => ASSIGNABLE_ROLES.indexOf(r);
  return [...list].sort((a, b) => rank(a.role) - rank(b.role) || (a.full_name || a.email || "").localeCompare(b.full_name || b.email || "", "vi"));
}
