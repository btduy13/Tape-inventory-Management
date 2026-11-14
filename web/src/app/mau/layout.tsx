import type { Metadata } from "next";

// /mau/* are landing-page drafts that repeat the home page: keep them out of search results.
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function MauLayout({ children }: { children: React.ReactNode }) {
  return children;
}
