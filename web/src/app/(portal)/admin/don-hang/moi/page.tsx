import type { Metadata } from "next";
import { requireTab } from "@/lib/auth/require-role";
import { NewOrderView, parseOrderType } from "@/features/admin-orders";

export const metadata: Metadata = { title: "Lên đơn" };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function AdminOrderNewPage({ searchParams }: Props) {
  await requireTab("orders", "orders.create");
  const sp = await searchParams;
  return <NewOrderView type={parseOrderType(sp.type)} quote={sp.quote === "1"} />;
}
