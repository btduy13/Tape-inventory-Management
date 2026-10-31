import { getDictionary } from "@/i18n";
import { requireRole } from "@/lib/auth/require-role";
import { ROLE_GROUPS } from "@/lib/auth/roles";
import { ROUTES } from "@/lib/routes";
import { LeadsTable, StatusFilter, loadLeadList } from "@/features/orders";

const t = getDictionary();

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function PortalPage({ searchParams }: Props) {
  // Pages re-check the role: layouts are not re-run on every client navigation.
  await requireRole(ROLE_GROUPS.internal);
  const { leads, status } = await loadLeadList((await searchParams).status);
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">{t.orders.title}</h1>
      <StatusFilter basePath={ROUTES.portal} current={status} />
      <LeadsTable leads={leads} />
    </div>
  );
}
