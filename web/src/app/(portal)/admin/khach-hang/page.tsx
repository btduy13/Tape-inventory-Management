import type { Metadata } from "next";
import { requireRole } from "@/lib/auth/require-role";
import { ROLE_GROUPS } from "@/lib/auth/roles";
import { CustomersView } from "@/features/customers";

export const metadata: Metadata = { title: "Khách hàng" };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function AdminCustomersPage({ searchParams }: Props) {
  await requireRole(ROLE_GROUPS.admin);
  return <CustomersView searchParams={await searchParams} />;
}
