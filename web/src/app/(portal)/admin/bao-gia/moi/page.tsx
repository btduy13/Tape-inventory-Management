import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ROUTES } from "@/lib/routes";
import { requireTab } from "@/lib/auth/require-role";
import { hasPerm } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/features/portal-ui";
import { orderIdSchema } from "@/features/admin-orders/lib/schemas";
import {
  QUOTE_TYPES, QuoteEditor, TYPE_LABEL, draftsFromQuote, getQuote, newQuoteHref, parseQuoteType, type SizeDraft,
} from "@/features/quotes/bao-gia";

export const metadata: Metadata = { title: "Tạo báo giá" };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export default async function NewQuotePage({ searchParams }: Props) {
  const sp = await searchParams;
  const rawId = one(sp.id);
  const type = parseQuoteType(sp.type);
  // Editing rewrites every size with its costs: orders.edit + orders.money, as in SQL.
  const profile = await requireTab("quotes", rawId ? "orders.edit" : "orders.create");
  const money = hasPerm(profile, "orders.money");

  let header = { ten_hang: "", ten_khach_hang: "", sdt_khach_hang: "", dia_chi_khach_hang: "", customer_id: "" };
  let sizes: SizeDraft[] = [];
  let id: string | null = null;
  if (rawId) {
    const parsed = orderIdSchema.safeParse(rawId);
    if (!parsed.success || !money) notFound();
    const quote = await getQuote(await createClient(), type, parsed.data);
    if (!quote) notFound();
    const s = (k: string) => (typeof quote[k] === "string" ? (quote[k] as string) : "");
    header = { ...header, ten_hang: s("ten_hang"), ten_khach_hang: s("ten_khach_hang"), sdt_khach_hang: s("sdt_khach_hang"), dia_chi_khach_hang: s("dia_chi_khach_hang") };
    sizes = draftsFromQuote(type, quote);
    id = parsed.data;
  }

  return (
    <>
      <PageHeader
        title={id ? "Sửa báo giá" : "Tạo báo giá"}
        breadcrumbs={[{ label: "Báo giá", href: ROUTES.adminQuotes }, { label: id ? `Sửa ${id}` : "Tạo mới" }]}
      />
      {!id && (
        <nav aria-label="Loại báo giá" className="mb-4 flex flex-wrap gap-2">
          {QUOTE_TYPES.map((t) => (
            <Link
              key={t}
              href={newQuoteHref(t)}
              aria-current={t === type ? "page" : undefined}
              className={`inline-flex min-h-11 items-center rounded-full border px-4 text-sm font-semibold ${t === type ? "border-vt-blue bg-vt-blue text-white" : "border-pt-line-strong text-pt-text"}`}
            >
              {TYPE_LABEL[t]}
            </Link>
          ))}
        </nav>
      )}
      <QuoteEditor key={`${type}:${id ?? "new"}`} type={type} id={id} header={header} sizes={sizes} money={money} />
    </>
  );
}
