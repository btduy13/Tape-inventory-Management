import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireTab } from "@/lib/auth/require-role";
import { CustomerDetailView, customerIdSchema } from "@/features/customers";

export const metadata: Metadata = { title: "Chi tiết khách hàng" };

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminCustomerPage({ params, searchParams }: Props) {
  await requireTab("customers");
  const parsed = customerIdSchema.safeParse((await params).id);
  if (!parsed.success) notFound();
  return <CustomerDetailView id={parsed.data} searchParams={await searchParams} />;
}
