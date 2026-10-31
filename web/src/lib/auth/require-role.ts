// Server-side role gate for pages, Server Actions and Route Handlers.
// RLS is the real enforcement; this gives clean redirects / 403s and fails early.
import "server-only";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/supabase/server";
import { ROUTES } from "@/lib/routes";
import type { AppRole, Profile } from "@/lib/types";
import { hasRole } from "@/lib/auth/roles";

/** For pages: redirects to /login (anonymous) or /portal (wrong role). */
export async function requireRole(allowed: readonly AppRole[]): Promise<Profile> {
  const profile = await getCurrentProfile();
  if (!profile) redirect(ROUTES.login);
  if (!hasRole(profile, allowed)) redirect(ROUTES.portal);
  return profile;
}

export class ForbiddenError extends Error {
  readonly status: number;
  constructor(status: 401 | 403, message = status === 401 ? "Unauthenticated" : "Forbidden") {
    super(message);
    this.name = "ForbiddenError";
    this.status = status;
  }
}

/** For Server Actions / Route Handlers: throws ForbiddenError instead of redirecting. */
export async function assertRole(allowed: readonly AppRole[]): Promise<Profile> {
  const profile = await getCurrentProfile();
  if (!profile) throw new ForbiddenError(401);
  if (!hasRole(profile, allowed)) throw new ForbiddenError(403);
  return profile;
}
