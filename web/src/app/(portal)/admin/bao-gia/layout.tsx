import { requireTab } from "@/lib/auth/require-role";

// Quotes tab + orders.view (0030). Pages re-check their own permission (create / edit), and the
// quote RPCs check has_perm() in SQL.
export default async function AdminQuotesLayout({ children }: { children: React.ReactNode }) {
  await requireTab("quotes");
  return children;
}
