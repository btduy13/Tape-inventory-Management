import { requireRole } from "@/lib/auth/require-role";
import { ROLE_GROUPS } from "@/lib/auth/roles";
import { UsersView } from "@/features/admin";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function AdminUsersPage({ searchParams }: Props) {
  const actor = await requireRole(ROLE_GROUPS.admin);
  return <UsersView actor={actor} searchParams={await searchParams} />;
}
