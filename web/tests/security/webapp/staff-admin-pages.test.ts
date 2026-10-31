// Rule: a staff (or ctv) session cannot load any /admin page.
import { beforeAll, describe, expect, it } from "vitest";
import { appSession, webFetch } from "../helpers/web";

const ADMIN_PAGES = ["/admin", "/admin/users", "/admin/presets", "/admin/leads/00000000-0000-0000-0000-0000000b0001"];

describe("staff session cannot load /admin pages", () => {
  const cookies: Record<string, string> = {};
  beforeAll(async () => {
    cookies.staff = await appSession("staff@local.test");
    cookies.ctv = await appSession("ctv@local.test");
  });

  for (const role of ["staff", "ctv"] as const) {
    it.each(ADMIN_PAGES)(`${role} GET %s is redirected away, no admin content`, async (path) => {
      const res = await webFetch(path, { cookie: cookies[role] });
      const body = await res.text();
      expect(res.status, `${role} ${path} status`).not.toBe(200);
      expect([302, 303, 307, 308, 403, 404]).toContain(res.status);
      if (res.headers.get("location")) {
        expect(new URL(res.headers.get("location")!, "http://x").pathname.startsWith("/admin")).toBe(false);
      }
      // No admin-only data in the response (users list / invite form / presets form).
      expect(body).not.toMatch(/admin@local\.test|manager@local\.test/);
    });
  }

  it("admin itself can load /admin (control)", async () => {
    const res = await webFetch("/admin", { cookie: await appSession("admin@local.test") });
    expect(res.status).toBe(200);
  });
});
