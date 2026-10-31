import Link from "next/link";
import { getDictionary } from "@/i18n";
import { requireRole } from "@/lib/auth/require-role";
import { ROLE_GROUPS } from "@/lib/auth/roles";
import { ROUTES } from "@/lib/routes";
import { AdminOverview } from "@/features/admin";

const t = getDictionary();

export default async function AdminPage() {
  await requireRole(ROLE_GROUPS.admin);
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">{t.admin.title}</h1>
      <AdminOverview />
      <nav className="flex flex-wrap gap-3 text-sm">
        <Link href={ROUTES.portal} className="text-amber-800 hover:underline">{t.nav.portal}</Link>
        <Link href={ROUTES.adminUsers} className="text-amber-800 hover:underline">{t.admin.users}</Link>
        <Link href={ROUTES.adminPresets} className="text-amber-800 hover:underline">{t.admin.presets}</Link>
      </nav>
    </div>
  );
}
