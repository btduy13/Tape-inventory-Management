import { requireRole } from "@/lib/auth/require-role";
import { ROLE_GROUPS } from "@/lib/auth/roles";
import { PresetsView } from "@/features/admin";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function AdminPresetsPage({ searchParams }: Props) {
  await requireRole(ROLE_GROUPS.admin);
  return <PresetsView searchParams={await searchParams} />;
}
