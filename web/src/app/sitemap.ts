import type { MetadataRoute } from "next";
import { PUBLIC_PAGES, siteUrl } from "@/lib/seo/site";

// No lastModified: a date that changes on every build would be a false signal.
export default function sitemap(): MetadataRoute.Sitemap {
  const site = siteUrl();
  return PUBLIC_PAGES.map((p) => ({
    url: p.path === "/" ? `${site}/` : `${site}${p.path}`,
    changeFrequency: p.changeFrequency,
    priority: p.priority,
  }));
}
