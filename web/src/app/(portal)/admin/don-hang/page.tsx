import type { Metadata } from "next";
import { requireTab } from "@/lib/auth/require-role";
import { OrdersView } from "@/features/admin-orders";
import { listPerms } from "@/features/admin-orders/lib/perms";

export const metadata: Metadata = { title: "Đơn hàng" };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

// Orders tab + orders.view (admins have every permission); the order RPCs re-check in SQL.
export default async function AdminOrdersPage({ searchParams }: Props) {
  const profile = await requireTab("orders", "orders.view");
  return <OrdersView searchParams={await searchParams} perms={listPerms(profile)} />;
}
