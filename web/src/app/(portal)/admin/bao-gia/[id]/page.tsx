import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { ROUTES } from "@/lib/routes";
import { requireTab } from "@/lib/auth/require-role";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/features/portal-ui";
import { buttonClass } from "@/features/portal-ui/components/styles";
import { orderIdSchema, orderTypeSchema } from "@/features/admin-orders/lib/schemas";
import { EXPORT_PRINT_CSS } from "@/features/order-export";
import { COMPANY } from "@/features/order-export/lib/copy";
import { PrintButton, QuoteSheet, getQuote } from "@/features/quotes/bao-gia";

export const metadata: Metadata = { title: "Xem báo giá" };

type Props = { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function QuotePrintPage({ params, searchParams }: Props) {
  await requireTab("quotes");
  const id = orderIdSchema.safeParse((await params).id);
  const raw = (await searchParams).type;
  const type = orderTypeSchema.safeParse((Array.isArray(raw) ? raw[0] : raw) ?? "bang_keo_in");
  if (!id.success || !type.success) notFound();
  const quote = await getQuote(await createClient(), type.data, id.data);
  if (!quote) notFound();
  // Same company block as the order voucher (the app's utils.companyInfo).
  const company = COMPANY;
  // CSP nonce for the print <style> (A4, print only the sheet).
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return (
    <>
      <style nonce={nonce}>{EXPORT_PRINT_CSS}</style>
      <PageHeader
        title={`Báo giá ${id.data}`}
        breadcrumbs={[{ label: "Báo giá", href: ROUTES.adminQuotes }, { label: id.data }]}
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href={ROUTES.adminQuotes} className={buttonClass("secondary")}>Quay lại</Link>
            <PrintButton />
          </div>
        }
      />
      <QuoteSheet type={type.data} quote={quote} company={company} />
    </>
  );
}
