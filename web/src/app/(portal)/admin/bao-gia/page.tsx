import type { Metadata } from "next";
import Link from "next/link";
import { getDictionary } from "@/i18n";
import { requireTab } from "@/lib/auth/require-role";
import { hasPerm } from "@/lib/auth/permissions";
import { PageHeader } from "@/features/portal-ui";
import { buttonClass } from "@/features/portal-ui/components/styles";
import { QuotesView, newQuoteHref } from "@/features/quotes/bao-gia";

export const metadata: Metadata = { title: "Báo giá" };

const c = getDictionary().baoGia;

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function QuotesPage({ searchParams }: Props) {
  const profile = await requireTab("quotes");
  const can = {
    edit: hasPerm(profile, "orders.edit") && hasPerm(profile, "orders.money"),
    convert: hasPerm(profile, "orders.create"),
    remove: hasPerm(profile, "orders.delete"),
  };
  return (
    <>
      <PageHeader
        title={c.listTitle}
        description={c.listDescription}
        actions={can.convert ? <Link href={newQuoteHref("bang_keo_in")} className={buttonClass("primary")}>{c.create}</Link> : undefined}
      />
      <QuotesView searchParams={await searchParams} can={can} />
    </>
  );
}
