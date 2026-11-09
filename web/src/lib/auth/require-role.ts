// Server-side role gate for pages, Server Actions and Route Handlers.
// RLS is the real enforcement; this gives clean redirects / 403s and fails early.
import "server-only";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/supabase/server";
import { ROUTES } from "@/lib/routes";
import type { AppRole, Profile } from "@/lib/types";
import { hasRole } from "@/lib/auth/roles";
import { canSeeTab, hasPerm, type NavTab, type Perm } from "@/lib/auth/permissions";

/** Landing page of a role: workshop users live in /portal/xuong, everyone else in /portal. */
export function homePathFor(profile: Pick<Profile, "role">): string {
  return profile.role === "workshop" ? ROUTES.workshop : ROUTES.portal;
}

/** For pages: redirects to /login (anonymous) or the role's home page (wrong role). */
export async function requireRole(allowed: readonly AppRole[]): Promise<Profile> {
  const profile = await getCurrentProfile();
  if (!profile) redirect(ROUTES.login);
  if (!hasRole(profile, allowed)) redirect(homePathFor(profile));
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

/**
 * For order / quote / customer pages: the tab must be visible (nav_tabs, includes orders.view)
 * and, when given, the extra permission held. Redirects like requireRole.
 */
export async function requireTab(tab: NavTab, perm?: Perm): Promise<Profile> {
  const profile = await getCurrentProfile();
  if (!profile) redirect(ROUTES.login);
  if (!canSeeTab(profile, tab) || (perm && !hasPerm(profile, perm))) redirect(homePathFor(profile));
  return profile;
}

/** For Server Actions: throws ForbiddenError unless the user holds `perm` (same rule as SQL has_perm). */
export async function assertPerm(perm: Perm): Promise<Profile> {
  const profile = await getCurrentProfile();
  if (!profile) throw new ForbiddenError(401);
  if (!hasPerm(profile, perm)) throw new ForbiddenError(403);
  return profile;
}
