import type { Metadata } from "next";
import { PublicQuotePage } from "@/features/quotes";
import { vi } from "@/i18n/vi";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: vi.quotes.title,
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default async function QuoteTokenPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <PublicQuotePage token={token} />;
}
