import { getDictionary } from "@/i18n";
import { redirect } from "next/navigation";
import { homePathFor, requireRole } from "@/lib/auth/require-role";
import { canSeeTab } from "@/lib/auth/permissions";
import { ROLE_GROUPS, seesAllLeads } from "@/lib/auth/roles";
import { ROUTES } from "@/lib/routes";
import { EmptyState, PageHeader } from "@/features/portal-ui";
import { LeadList, loadLeadListPage } from "@/features/orders";

const c = getDictionary().leadsUi;
const p = getDictionary().portalUi;

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function PortalPage({ searchParams }: Props) {
  // Pages re-check the role: layouts are not re-run on every client navigation.
  // /portal is everyone's fallback home: without the leads tab go to the first allowed tab, else say so
  // (redirecting here again would loop).
  const profile = await requireRole(ROLE_GROUPS.portal);
  if (!canSeeTab(profile, "leads")) {
    const home = homePathFor(profile);
    if (home !== ROUTES.portal) redirect(home);
    return <EmptyState title={p.noTabsTitle} body={p.noTabsBody} />;
  }
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
