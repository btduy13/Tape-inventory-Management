import { requireRole } from "@/lib/auth/require-role";
import { ROLE_GROUPS } from "@/lib/auth/roles";

// Customers show sales and debt: admin only (the parent admin layout also lets managers in).
// Each page re-checks, and the customer RPCs are admin-only in SQL.
export default async function AdminCustomersLayout({ children }: { children: React.ReactNode }) {
  await requireRole(ROLE_GROUPS.admin);
  return children;
}
