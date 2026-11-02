import { requireRole } from "@/lib/auth/require-role";
import { ROLE_GROUPS } from "@/lib/auth/roles";
import { WorkshopDashboard } from "@/features/workshop";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function WorkshopPage({ searchParams }: { searchParams: SearchParams }) {
  // Pages re-check the role: layouts are not re-run on every client navigation.
  const profile = await requireRole(ROLE_GROUPS.production);
  return <WorkshopDashboard profile={profile} searchParams={await searchParams} />;
}
