import type { MetadataRoute } from "next";
import { DISALLOWED_PATHS, siteUrl } from "@/lib/seo/site";

export default function robots(): MetadataRoute.Robots {
  const site = siteUrl();
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: DISALLOWED_PATHS }],
    sitemap: `${site}/sitemap.xml`,
    host: site,
  };
}
