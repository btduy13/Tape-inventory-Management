// Rule: the login `?next=` / `next` field only ever leads to a same-site relative path.
// Checked three ways: the login Server Action redirect, the GET /login redirect for an
// already-logged-in user, and the hidden `next` input rendered into the login form.
import { beforeAll, describe, expect, it } from "vitest";
import { WEB_ORIGIN, appSession, loginViaApp, webFetch } from "../helpers/web";

const HOSTILE = [
  "//evil.example",
  "///evil.example",
  "/\evil.example",
  "\\evil.example",
  "https://evil.example/portal",
  "http:evil.example",
  "javascript:alert(1)",
  "/%2F%2Fevil.example",
  "%2F%2Fevil.example",
  "/%5Cevil.example",
  "/%252F%252Fevil.example",
  "/.//evil.example",
  "/..//evil.example",
  "/portal/..//evil.example",
  "/%2e//evil.example",
  "/\t/evil.example",
  " //evil.example",
];

/** A destination is safe when it resolves to our own origin from any page of the site. */
function isSameSiteRelative(target: string): boolean {
  if (!target.startsWith("/") || target.startsWith("//") || target.includes("\\")) return false;
  const resolved = new URL(target, `${WEB_ORIGIN}/login`);
  return resolved.origin === WEB_ORIGIN;
}

function locationOf(res: Response): string | null {
  const loc = res.headers.get("location");
  if (!loc) return null;
  // Next may send an absolute URL; reduce to what the browser would navigate to.
  const u = new URL(loc, `${WEB_ORIGIN}/login`);
  return u.origin === WEB_ORIGIN ? loc.replace(WEB_ORIGIN, "") : loc;
}

describe("login next= only allows same-site relative paths", () => {
  let cookie: string;
  beforeAll(async () => {
    cookie = await appSession("staff@local.test");
  });

  it("allows a normal relative path", async () => {
    const r = await loginViaApp("staff@local.test", "devpassword123", "/portal?status=new");
    expect(r.redirect).toBe("/portal?status=new");
  });

  it.each(HOSTILE)("login action does not redirect off-site for next=%j", async (next) => {
    const r = await loginViaApp("staff@local.test", "devpassword123", next);
    expect(r.redirect, `no redirect for ${JSON.stringify(next)}: HTTP ${r.res.status}`).not.toBeNull();
    // Browsers resolve the action redirect against the current page URL.
    const resolved = new URL(r.redirect!, `${WEB_ORIGIN}/login`);
    expect(resolved.origin, `redirect target ${JSON.stringify(r.redirect)}`).toBe(WEB_ORIGIN);
    expect(isSameSiteRelative(r.redirect!), `redirect target ${JSON.stringify(r.redirect)}`).toBe(true);
  });

  it.each(HOSTILE)("GET /login (logged in) does not redirect off-site for next=%j", async (next) => {
    const res = await webFetch(`/login?next=${encodeURIComponent(next)}`, { cookie });
    expect([302, 303, 307, 308]).toContain(res.status);
    const loc = locationOf(res);
    expect(loc).not.toBeNull();
    expect(new URL(loc!, `${WEB_ORIGIN}/login`).origin, `Location ${JSON.stringify(loc)}`).toBe(WEB_ORIGIN);
    expect(isSameSiteRelative(loc!), `Location ${JSON.stringify(loc)}`).toBe(true);
  });

  it.each(HOSTILE)("login form hidden next is same-site for next=%j", async (next) => {
    const res = await webFetch(`/login?next=${encodeURIComponent(next)}`);
    expect(res.status).toBe(200);
    const html = await res.text();
    const m = html.match(/<input[^>]*name="next"[^>]*value="([^"]*)"/) ?? html.match(/<input[^>]*value="([^"]*)"[^>]*name="next"/);
    expect(m, "hidden next input rendered").not.toBeNull();
    const value = m![1]!.replace(/&amp;/g, "&");
    expect(isSameSiteRelative(value), `hidden next=${JSON.stringify(value)}`).toBe(true);
  });
});
