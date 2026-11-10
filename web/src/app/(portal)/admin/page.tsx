import { getDictionary } from "@/i18n";
import { requireRole } from "@/lib/auth/require-role";
import { ROLE_GROUPS } from "@/lib/auth/roles";
import { PageHeader } from "@/features/portal-ui";
import { AdminDashboard, loadAdminOverview } from "@/features/admin";
import { dashboardCopy } from "@/features/admin/lib/copy";
import { createClient } from "@/lib/supabase/server";

const c = getDictionary().leadsUi;

export default async function AdminPage() {
  await requireRole(ROLE_GROUPS.admin);
  const data = await createClient().then(loadAdminOverview);
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={c.overviewTitle} description={dashboardCopy.description} />
      <AdminDashboard data={data} />
    </div>
  );
}
