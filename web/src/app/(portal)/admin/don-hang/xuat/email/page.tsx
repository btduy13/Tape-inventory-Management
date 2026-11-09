import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireTab } from "@/lib/auth/require-role";
import { orderIdSchema, parseOrderType } from "@/features/admin-orders";
import { EmailView } from "@/features/order-export";

export const metadata: Metadata = { title: "Gửi email đơn hàng" };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function OrderEmailPage({ searchParams }: Props) {
  await requireTab("orders", "orders.edit");
  const sp = await searchParams;
  const id = orderIdSchema.safeParse(Array.isArray(sp.id) ? sp.id[0] : sp.id);
  if (!id.success) notFound();
  return <EmailView type={parseOrderType(sp.type)} id={id.data} />;
}
