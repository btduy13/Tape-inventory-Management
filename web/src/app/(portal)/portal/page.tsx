import { getDictionary } from "@/i18n";
import { requireRole } from "@/lib/auth/require-role";
import { ROLE_GROUPS, seesAllLeads } from "@/lib/auth/roles";
import { ROUTES } from "@/lib/routes";
import { PageHeader } from "@/features/portal-ui";
import { LeadList, loadLeadListPage } from "@/features/orders";

const c = getDictionary().leadsUi;

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function PortalPage({ searchParams }: Props) {
  // Pages re-check the role: layouts are not re-run on every client navigation.
  const profile = await requireRole(ROLE_GROUPS.internal);
  // Display only: RLS already limits staff/ctv to the leads assigned to them.
  const mine = !seesAllLeads(profile);
  const data = await loadLeadListPage(profile, await searchParams);
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={mine ? c.titleMine : c.titleAll} description={mine ? c.descMine : c.descAll} />
      <LeadList data={data} basePath={ROUTES.portal} detail={profile.role === "admin" ? "admin" : "portal"} mine={mine} />
    </div>
  );
}
