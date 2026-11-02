import { getDictionary } from "@/i18n";
import { requireRole } from "@/lib/auth/require-role";
import { ROLE_GROUPS } from "@/lib/auth/roles";
import { ROUTES } from "@/lib/routes";
import { PageHeader, Section } from "@/features/portal-ui";
import { LeadList, LeadOverview, loadLeadListPage, loadOverview } from "@/features/orders";

const c = getDictionary().leadsUi;

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function AdminPage({ searchParams }: Props) {
  const profile = await requireRole(ROLE_GROUPS.admin);
  // The lead table's realtime subscription refreshes the whole page, counts included.
  const [overview, list] = await Promise.all([loadOverview(), loadLeadListPage(profile, await searchParams)]);
  return (
    <div className="flex flex-col gap-8">
      <PageHeader title={c.overviewTitle} description={c.overviewDesc} />
      <LeadOverview data={overview} basePath={ROUTES.admin} />
      <Section id="danh-sach" title={c.allLeads} variant="plain">
        <LeadList data={list} basePath={ROUTES.admin} detail="admin" mine={false} />
      </Section>
    </div>
  );
}
