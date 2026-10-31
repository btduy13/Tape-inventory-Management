// Rule: every route sends a CSP with a fresh per-request nonce (no unsafe-inline/eval for
// scripts), frame-ancestors 'none', X-Content-Type-Options nosniff and, in production, HSTS.
import { describe, expect, it } from "vitest";
import { webFetch } from "../helpers/web";

const ROUTES: Array<{ path: string; method: string }> = [
  { path: "/", method: "GET" },
  { path: "/thiet-ke", method: "GET" },
  { path: "/login", method: "GET" },
  { path: "/login?next=/admin", method: "GET" },
  { path: "/auth/reset", method: "GET" },
  { path: "/auth/update-password", method: "GET" },
  { path: "/auth/callback", method: "GET" },
  { path: "/portal", method: "GET" },
  { path: "/admin", method: "GET" },
  { path: "/q/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA", method: "GET" },
  { path: "/this-route-does-not-exist", method: "GET" },
  { path: "/api/leads", method: "GET" },
  { path: "/api/leads", method: "POST" },
  { path: "/api/q/AAAA/respond", method: "POST" },
];

function nonceOf(csp: string): string | null {
  return csp.match(/script-src[^;]*'nonce-([^']+)'/)?.[1] ?? null;
}

describe("every route sends CSP (nonce, frame-ancestors none), nosniff and HSTS", () => {
  it.each(ROUTES)("$method $path", async ({ path, method }) => {
    const res = await webFetch(path, {
      method,
      headers: method === "POST" ? { Origin: "https://evil.example" } : {},
    });
    const csp = res.headers.get("content-security-policy") ?? "";
    expect(csp, `CSP on ${path} (HTTP ${res.status})`).not.toBe("");
    expect(nonceOf(csp), "script-src nonce").not.toBeNull();
    expect(csp).toMatch(/frame-ancestors 'none'/);
    expect(csp).toMatch(/object-src 'none'/);
    const scriptSrc = csp.match(/script-src([^;]*)/)?.[1] ?? "";
    expect(scriptSrc).not.toMatch(/'unsafe-inline'|'unsafe-eval'/);
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    expect(res.headers.get("strict-transport-security") ?? "").toMatch(/max-age=\d{8,}/);
  });

  it("nonce is fresh per request and matches the page's script tags", async () => {
    const a = await webFetch("/login");
    const b = await webFetch("/login");
    const na = nonceOf(a.headers.get("content-security-policy") ?? "");
    const nb = nonceOf(b.headers.get("content-security-policy") ?? "");
    expect(na).not.toBeNull();
    expect(na).not.toBe(nb);
    expect(na!.length).toBeGreaterThanOrEqual(16);
    const html = await a.text();
    const scriptNonces = [...html.matchAll(/<script[^>]*\snonce="([^"]+)"/g)].map((m) => m[1]);
    expect(scriptNonces.length).toBeGreaterThan(0);
    for (const n of scriptNonces) expect(n).toBe(na);
    // No inline <script> without the nonce.
    const inlineWithout = [...html.matchAll(/<script(?![^>]*\snonce=)(?![^>]*\ssrc=)[^>]*>/g)];
    expect(inlineWithout.length, inlineWithout.map((m) => m[0]).join(" ")).toBe(0);
  });
});
