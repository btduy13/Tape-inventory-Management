import type { Metadata } from "next";
import { requireRole } from "@/lib/auth/require-role";
import { ROLE_GROUPS } from "@/lib/auth/roles";
import { NewOrderView } from "@/features/admin-orders";

export const metadata: Metadata = { title: "Lên đơn băng keo in" };

export default async function AdminOrderNewPage() {
  await requireRole(ROLE_GROUPS.admin);
  return <NewOrderView />;
}
