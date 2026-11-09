import { requireTab } from "@/lib/auth/require-role";
import { WorkshopDashboard } from "@/features/workshop";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function WorkshopPage({ searchParams }: { searchParams: SearchParams }) {
  // Pages re-check the role: layouts are not re-run on every client navigation.
  const profile = await requireTab("workshop");
  return <WorkshopDashboard profile={profile} searchParams={await searchParams} />;
}
