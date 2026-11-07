import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/require-role";
import { ROLE_GROUPS } from "@/lib/auth/roles";
import { EditOrderView, orderIdSchema, parseOrderType } from "@/features/admin-orders";

export const metadata: Metadata = { title: "Sửa đơn" };

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminOrderEditPage({ params, searchParams }: Props) {
  await requireRole(ROLE_GROUPS.admin);
  const parsed = orderIdSchema.safeParse((await params).id);
  if (!parsed.success) notFound();
  return <EditOrderView id={parsed.data} type={parseOrderType((await searchParams).type)} />;
}
