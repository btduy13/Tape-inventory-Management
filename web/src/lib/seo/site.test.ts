import { describe, expect, it } from "vitest";
import robots from "@/app/robots";
import sitemap from "@/app/sitemap";
import { metadata as mauMetadata } from "@/app/mau/layout";
import { DISALLOWED_PATHS, parseVerification, siteUrl } from "./site";

describe("siteUrl", () => {
  it("drops trailing slashes and falls back to localhost", () => {
    expect(siteUrl("https://bangkeo.in/")).toBe("https://bangkeo.in");
    expect(siteUrl(undefined)).toBe("http://localhost:3000");
  });
});

describe("robots.txt", () => {
  it("allows the site, blocks private areas, points to the sitemap", () => {
    const r = robots();
    const rule = Array.isArray(r.rules) ? r.rules[0] : r.rules;
    expect(rule.userAgent).toBe("*");
    expect(rule.allow).toBe("/");
    expect(rule.disallow).toEqual(DISALLOWED_PATHS);
    expect(r.sitemap).toMatch(/\/sitemap\.xml$/);
  });

  it("does not block noindex pages, so crawlers can see their noindex", () => {
    for (const p of ["/login", "/mau", "/q/", "/giao/", "/thiet-ke", "/"]) {
      expect(DISALLOWED_PATHS.some((d) => p.startsWith(d))).toBe(false);
    }
  });
});

describe("sitemap.xml", () => {
  it("lists only the public pages as absolute URLs", () => {
    const urls = sitemap().map((e) => new URL(e.url).pathname);
    expect(urls).toEqual(["/", "/thiet-ke", "/dieu-khoan"]);
    expect(urls.some((u) => u.startsWith("/mau") || u.startsWith("/admin"))).toBe(false);
  });
});

describe("/mau layout", () => {
  it("marks every landing draft noindex", () => {
    expect(mauMetadata.robots).toEqual({ index: false, follow: false });
  });
});

describe("parseVerification", () => {
  it("parses name=content pairs", () => {
    expect(parseVerification("google-site-verification=abc_123-XY;msvalidate.01=0A1B2C")).toEqual({
      "google-site-verification": "abc_123-XY",
      "msvalidate.01": "0A1B2C",
    });
  });

  it("ignores empty, malformed and unsafe entries", () => {
    expect(parseVerification(undefined)).toEqual({});
    expect(parseVerification(";=x;novalue;bad name=1;x=<script>")).toEqual({});
  });
});
