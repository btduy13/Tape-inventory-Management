import type { Metadata } from "next";
import { requireRole } from "@/lib/auth/require-role";
import { ROLE_GROUPS } from "@/lib/auth/roles";
import { NewOrderView, parseOrderType } from "@/features/admin-orders";

export const metadata: Metadata = { title: "Lên đơn" };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function AdminOrderNewPage({ searchParams }: Props) {
  await requireRole(ROLE_GROUPS.admin);
  const sp = await searchParams;
  return <NewOrderView type={parseOrderType(sp.type)} quote={sp.quote === "1"} />;
}
