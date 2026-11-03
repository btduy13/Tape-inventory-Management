import type { Metadata } from "next";
import { requireRole } from "@/lib/auth/require-role";
import { ROLE_GROUPS } from "@/lib/auth/roles";
import { OrdersView } from "@/features/admin-orders";

export const metadata: Metadata = { title: "Đơn hàng" };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function AdminOrdersPage({ searchParams }: Props) {
  await requireRole(ROLE_GROUPS.admin);
  return <OrdersView searchParams={await searchParams} />;
}
