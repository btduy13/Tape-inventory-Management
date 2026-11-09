import type { Metadata } from "next";
import { headers } from "next/headers";
import { requireTab } from "@/lib/auth/require-role";
import { EXPORT_PRINT_CSS, ExportView } from "@/features/order-export";

export const metadata: Metadata = { title: "Xuất đơn / phiếu giao hàng" };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function OrderExportPage({ searchParams }: Props) {
  await requireTab("orders", "orders.export");
  // CSP nonce for the print <style> (A4, print only the voucher).
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return (
    <>
      <style nonce={nonce}>{EXPORT_PRINT_CSS}</style>
      <ExportView searchParams={await searchParams} />
    </>
  );
}
