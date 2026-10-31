// Rule: Server Actions refuse a request whose Origin does not match the app (CSRF):
// no session cookie is issued and the action does not run.
import { beforeAll, describe, expect, it } from "vitest";
import { ACTIONS, actionResult, appSession, callAction, loginViaApp } from "../helpers/web";

const FOREIGN = ["https://evil.example", "http://localhost.evil.example", "null"];

describe("server actions refuse a mismatched Origin", () => {
  it.each(FOREIGN)("loginAction with Origin %s issues no session", async (origin) => {
    const r = await loginViaApp("staff@local.test", "devpassword123", "/portal", origin);
    expect(r.res.status, `HTTP ${r.res.status}`).toBeGreaterThanOrEqual(400);
    expect(r.redirect).toBeNull();
    expect(r.setCookies.some((c) => c.includes("auth-token=base64")), "auth cookie set").toBe(false);
  });

  it("control: same Origin login succeeds", async () => {
    const r = await loginViaApp("staff@local.test", "devpassword123");
    expect(r.redirect).toBe("/portal");
  });

  describe("authenticated admin action", () => {
    let cookie: string;
    beforeAll(async () => {
      cookie = await appSession("admin@local.test");
    });
    it.each(FOREIGN)("savePresetAction with Origin %s does not execute", async (origin) => {
      const res = await callAction({ page: "/admin/presets", id: ACTIONS.savePreset(), fields: {}, cookie, origin });
      const result = actionResult(await res.text());
      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(result).toBeNull();
    });
  });
});
