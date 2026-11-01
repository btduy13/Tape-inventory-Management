import { requireRole } from "@/lib/auth/require-role";
import { ROLE_GROUPS } from "@/lib/auth/roles";
import { WorkshopDashboard } from "@/features/workshop";

export default async function WorkshopPage() {
  // Pages re-check the role: layouts are not re-run on every client navigation.
  const profile = await requireRole(ROLE_GROUPS.production);
  return <WorkshopDashboard profile={profile} />;
}
