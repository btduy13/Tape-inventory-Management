import { requireTab } from "@/lib/auth/require-role";

// Orders tab + orders.view (0030). Each page re-checks (create / edit need their own permission),
// and the order RPCs check has_perm() in SQL; money columns come back null without orders.money.
export default async function AdminOrdersLayout({ children }: { children: React.ReactNode }) {
  await requireTab("orders");
  return children;
}
