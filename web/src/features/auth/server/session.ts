import "server-only";
import { createClient, getCurrentProfile } from "@/lib/supabase/server";

/** True when a (possibly not yet activated) Supabase session exists, e.g. after an invite link. */
export async function hasAuthSession(): Promise<boolean> {
  const db = await createClient();
  const { data } = await db.auth.getUser();
  return !!data.user;
}

/** Active internal user already logged in (used to skip the login form). */
export async function isLoggedInActiveUser(): Promise<boolean> {
  return (await getCurrentProfile()) !== null;
}
