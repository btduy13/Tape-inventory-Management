import { requireRole } from "@/lib/auth/require-role";
import { ROLE_GROUPS } from "@/lib/auth/roles";

// Orders show costs, profit and customer debt: admin only (the parent admin layout also lets
// managers in). Each page re-checks, and the order RPCs are admin-only in SQL.
export default async function AdminOrdersLayout({ children }: { children: React.ReactNode }) {
  await requireRole(ROLE_GROUPS.admin);
  return children;
}
