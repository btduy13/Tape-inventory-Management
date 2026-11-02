// not-found.tsx body for the portal segments: rendered inside AppShell, home link follows the role.
import "server-only";
import { getCurrentProfile } from "@/lib/supabase/server";
import { ROUTES } from "@/lib/routes";
import { homeFor } from "../lib/nav";
import { NotFoundState } from "./States";

export async function PortalNotFound() {
  const profile = await getCurrentProfile();
  return <NotFoundState homeHref={profile ? homeFor(profile.role) : ROUTES.login} />;
}
