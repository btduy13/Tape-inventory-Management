import { requireTab } from "@/lib/auth/require-role";

// Customers tab + orders.view (0030). Each page re-checks (/gop stays admin only), and the customer
// RPCs check has_perm() in SQL.
export default async function AdminCustomersLayout({ children }: { children: React.ReactNode }) {
  await requireTab("customers");
  return children;
}
