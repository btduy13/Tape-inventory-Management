import type { Metadata, Viewport } from "next";
import { connection } from "next/server";
import { getDictionary } from "@/i18n";
import { parseVerification } from "@/lib/seo/site";
import "./globals.css";

// System font stack (full Vietnamese glyph support, no build-time network fetch).
// To self-host a brand font later, use next/font/local with files in src/app/fonts/.
const t = getDictionary();

export const metadata: Metadata = {
  title: { default: t.common.appName, template: `%s | ${t.common.appName}` },
  description: t.landing.heroSubtitle,
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  robots: { index: true, follow: true },
  // Search Console / Bing / Yandex / Coc Coc ownership tags, set without a code change:
  // SEARCH_VERIFICATION="google-site-verification=...;msvalidate.01=..." (see lib/seo/site.ts).
  verification: { other: parseVerification(process.env.SEARCH_VERIFICATION) },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/brand/vinh-thinh-icon.png", type: "image/png", sizes: "512x512" },
    ],
    apple: { url: "/brand/apple-touch-icon.png", sizes: "180x180" },
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#cf1f27",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Render per request so Next.js can apply the CSP nonce set in src/proxy.ts.
  await connection();
  return (
    <html lang="vi" className="h-full antialiased">
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
