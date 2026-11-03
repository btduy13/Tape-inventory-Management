import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/require-role";
import { ROLE_GROUPS } from "@/lib/auth/roles";
import { OrderDetailView, orderIdSchema } from "@/features/admin-orders";

export const metadata: Metadata = { title: "Chi tiết đơn" };

type Props = { params: Promise<{ id: string }> };

export default async function AdminOrderPage({ params }: Props) {
  await requireRole(ROLE_GROUPS.admin);
  const parsed = orderIdSchema.safeParse((await params).id);
  if (!parsed.success) notFound();
  return <OrderDetailView id={parsed.data} />;
}
