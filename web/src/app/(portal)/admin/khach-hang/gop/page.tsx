import type { Metadata } from "next";
import { requireRole } from "@/lib/auth/require-role";
import { ROLE_GROUPS } from "@/lib/auth/roles";
import { ReviewView } from "@/features/customers";

export const metadata: Metadata = { title: "Duyệt ghép đơn cũ" };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function AdminCustomerReviewPage({ searchParams }: Props) {
  await requireRole(ROLE_GROUPS.admin);
  return <ReviewView searchParams={await searchParams} />;
}
