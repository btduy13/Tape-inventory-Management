import { getDictionary } from "@/i18n";
import { requireRole } from "@/lib/auth/require-role";
import { ROLE_GROUPS } from "@/lib/auth/roles";
import { UsersSection } from "@/features/admin";

const t = getDictionary();

export default async function AdminUsersPage() {
  const actor = await requireRole(ROLE_GROUPS.admin);
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">{t.admin.users}</h1>
      <UsersSection actor={actor} />
    </div>
  );
}
