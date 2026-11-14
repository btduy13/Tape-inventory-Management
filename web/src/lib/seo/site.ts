// Search-engine settings shared by robots.ts, sitemap.ts and the root layout metadata.
import type { MetadataRoute } from "next";

/** Public origin without a trailing slash (NEXT_PUBLIC_SITE_URL, e.g. https://bangkeo.in). */
export function siteUrl(env: string | undefined = process.env.NEXT_PUBLIC_SITE_URL): string {
  return (env ?? "http://localhost:3000").replace(/\/+$/, "");
}

/**
 * Pages listed in sitemap.xml: only real public pages. /mau/* (landing drafts), /login,
 * /q/<token> and /giao/<token> stay out; they send noindex instead.
 */
export const PUBLIC_PAGES: ReadonlyArray<{
  path: string;
  changeFrequency: NonNullable<MetadataRoute.Sitemap[number]["changeFrequency"]>;
  priority: number;
}> = [
  { path: "/", changeFrequency: "weekly", priority: 1 },
  { path: "/thiet-ke", changeFrequency: "monthly", priority: 0.9 },
  { path: "/dieu-khoan", changeFrequency: "yearly", priority: 0.3 },
];

/**
 * Not crawled at all: signed-in areas and APIs. Pages that carry noindex (/login, /mau,
 * /q, /giao) are NOT blocked here, so crawlers can read their noindex and drop them.
 */
export const DISALLOWED_PATHS = ["/api/", "/admin", "/portal", "/auth/"];

/**
 * Extra verification meta tags from SEARCH_VERIFICATION, e.g.
 * "google-site-verification=abc;msvalidate.01=XYZ;yandex-verification=123".
 * Each entry becomes <meta name="..." content="...">. Invalid entries are ignored.
 */
export function parseVerification(raw: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  for (const part of (raw ?? "").split(";")) {
    const i = part.indexOf("=");
    if (i <= 0) continue;
    const name = part.slice(0, i).trim();
    const content = part.slice(i + 1).trim();
    if (/^[A-Za-z0-9._:-]{1,64}$/.test(name) && /^[A-Za-z0-9._:=+/-]{1,200}$/.test(content)) {
      out[name] = content;
    }
  }
  return out;
}
