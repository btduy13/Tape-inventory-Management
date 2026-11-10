import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { requireTab } from "@/lib/auth/require-role";
import { hasPerm } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { orderIdSchema, orderTypeSchema } from "@/features/admin-orders/lib/schemas";
import { EXPORT_PRINT_CSS } from "@/features/order-export";
import { COMPANY } from "@/features/order-export/lib/copy";
import { QuoteDetail, getQuote } from "@/features/quotes/bao-gia";

export const metadata: Metadata = { title: "Xem báo giá" };

type Props = { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function QuoteDetailPage({ params, searchParams }: Props) {
  const profile = await requireTab("quotes");
  const id = orderIdSchema.safeParse((await params).id);
  const raw = (await searchParams).type;
  const type = orderTypeSchema.safeParse((Array.isArray(raw) ? raw[0] : raw) ?? "bang_keo_in");
  if (!id.success || !type.success) notFound();
  const quote = await getQuote(await createClient(), type.data, id.data);
  if (!quote) notFound();
  const can = {
    edit: hasPerm(profile, "orders.edit") && hasPerm(profile, "orders.money"),
    convert: hasPerm(profile, "orders.create"),
    remove: hasPerm(profile, "orders.delete"),
  };
  // CSP nonce for the print <style> (A4, print only the sheet).
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return (
    <>
      <style nonce={nonce}>{EXPORT_PRINT_CSS}</style>
      {/* Same company block as the order voucher (the app's utils.companyInfo). */}
      <QuoteDetail type={type.data} quote={quote} company={COMPANY} can={can} />
    </>
  );
}
