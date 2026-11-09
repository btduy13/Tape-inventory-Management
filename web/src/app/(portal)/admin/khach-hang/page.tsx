import type { Metadata } from "next";
import { requireTab } from "@/lib/auth/require-role";
import { CustomersView } from "@/features/customers";

export const metadata: Metadata = { title: "Khách hàng" };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function AdminCustomersPage({ searchParams }: Props) {
  await requireTab("customers");
  return <CustomersView searchParams={await searchParams} />;
}
