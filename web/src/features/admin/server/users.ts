// User management core (framework-free; unit-tested with mocks).
// `admin` = service-role client (auth.admin.*). `db` = logged-in admin's RLS client.
// Callers MUST assertRole(ROLE_GROUPS.admin) before calling these.
import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types";
import type { InviteInput, UpdateUserInput } from "../lib/schemas";

type Db = SupabaseClient<Database>;

export type InviteResult = { ok: true; userId: string } | { ok: false; reason: "exists" | "generic" };

/** ~100 years: Supabase Auth ban used as a second lock next to profiles.is_active. */
export const DEACTIVATED_BAN = "876000h";

function isAlreadyRegistered(error: { code?: string; message?: string; status?: number }): boolean {
  return error.code === "email_exists" || error.status === 422 || /already/i.test(error.message ?? "");
}

/**
 * Invites a user and gives them their role BEFORE first login (SECURITY_REPORT S3):
 * app_metadata.role (source of truth for future auth triggers) + an active profile row.
 * Rolls the auth user back if the role cannot be stored, so no half-created account remains.
 */
export async function inviteUser(admin: Db, input: InviteInput, redirectTo: string): Promise<InviteResult> {
  const { data, error } = await admin.auth.admin.inviteUserByEmail(input.email, {
    data: { full_name: input.fullName },
    redirectTo,
  });
  if (error || !data.user) return { ok: false, reason: error && isAlreadyRegistered(error) ? "exists" : "generic" };
  const userId = data.user.id;

  const meta = await admin.auth.admin.updateUserById(userId, { app_metadata: { role: input.role } });
  const profile = meta.error
    ? { error: meta.error }
    : await admin
        .from("profiles")
        .upsert({ id: userId, email: input.email, full_name: input.fullName, role: input.role, is_active: true }, { onConflict: "id" });

  if (profile.error) {
    await admin.auth.admin.deleteUser(userId).catch(() => undefined);
    return { ok: false, reason: "generic" };
  }
  return { ok: true, userId };
}

export type UpdateUserResult =
  | { ok: true; authSynced: boolean }
  | { ok: false; reason: "forbidden" | "notFound" | "generic" };

/**
 * Role / active flag change. The profile update runs through RLS + profiles_guard_columns
 * (admin only, no self-lockout). Auth metadata + ban are synced afterwards (best effort).
 */
export async function updateUser(db: Db, admin: Db, input: UpdateUserInput): Promise<UpdateUserResult> {
  const { data, error } = await db
    .from("profiles")
    .update({ role: input.role, is_active: input.isActive })
    .eq("id", input.userId)
    .select("id")
    .maybeSingle();
  if (error) return { ok: false, reason: error.code === "42501" ? "forbidden" : "generic" };
  if (!data) return { ok: false, reason: "notFound" };

  try {
    const { error: syncError } = await admin.auth.admin.updateUserById(input.userId, {
      app_metadata: { role: input.role },
      ban_duration: input.isActive ? "none" : DEACTIVATED_BAN,
    });
    return { ok: true, authSynced: !syncError };
  } catch {
    return { ok: true, authSynced: false };
  }
}
