// Terms of use. Thin: content lives in features/legal.
import type { Metadata } from "next";
import { TermsPage } from "@/features/legal/TermsPage";
import { TERMS_TITLE } from "@/features/legal/terms-content";

export const metadata: Metadata = { title: TERMS_TITLE, alternates: { canonical: "/dieu-khoan" } };

export default function Page() {
  return <TermsPage />;
}
