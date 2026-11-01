// Display names for timeline actors that profiles RLS hides from the caller (staff/ctv only
// read their own profile, so an admin's assignment showed actor "—").
// Only called with ids taken from timeline rows the caller already read through RLS, and
// returns full_name only (never email / role / phone).
import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export type NameResolver = (ids: readonly string[]) => Promise<Record<string, string>>;

export const actorNamesViaService: NameResolver = async (ids) => {
  if (ids.length === 0) return {};
  const { data } = await createAdminClient().from("profiles").select("id, full_name").in("id", [...ids]);
  const out: Record<string, string> = {};
  for (const p of data ?? []) if (p.full_name) out[p.id] = p.full_name;
  return out;
};
