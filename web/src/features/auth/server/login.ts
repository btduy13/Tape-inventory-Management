// Login / password logic, independent of Next.js so it is unit-testable with a mocked client.
import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types";

type Db = SupabaseClient<Database>;

export type LoginResult = "ok" | "invalid" | "disabled" | "error";

/**
 * Signs in and verifies the profile is an ACTIVE internal user.
 * Inactive / un-invited accounts are signed out again so no session cookie remains.
 */
export async function performLogin(db: Db, email: string, password: string): Promise<LoginResult> {
  const { data, error } = await db.auth.signInWithPassword({ email, password });
  if (error || !data.user) {
    // Do not reveal whether the email exists.
    return error && error.status !== undefined && error.status >= 500 ? "error" : "invalid";
  }
  const { data: profile, error: profileError } = await db
    .from("profiles")
    .select("id, is_active")
    .eq("id", data.user.id)
    .maybeSingle();
  if (profileError) {
    await db.auth.signOut();
    return "error";
  }
  if (!profile || !profile.is_active) {
    await db.auth.signOut();
    return "disabled";
  }
  return "ok";
}

/** Always resolves the same way so callers cannot enumerate accounts. */
export async function requestPasswordReset(db: Db, email: string, redirectTo: string): Promise<void> {
  try {
    await db.auth.resetPasswordForEmail(email, { redirectTo });
  } catch {
    /* swallow: response must not depend on account existence */
  }
}

export type UpdatePasswordResult = "ok" | "no-session" | "weak" | "error";

export async function updatePassword(db: Db, password: string): Promise<UpdatePasswordResult> {
  const { data } = await db.auth.getUser();
  if (!data.user) return "no-session";
  const { error } = await db.auth.updateUser({ password });
  if (!error) return "ok";
  if (error.code === "weak_password" || error.code === "same_password") return "weak";
  return "error";
}
