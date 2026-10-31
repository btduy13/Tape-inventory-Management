// Rule: login and password reset answer identically for an existing and an unknown email.
import { describe, expect, it } from "vitest";
import { ACTIONS, actionResult, callAction, loginViaApp } from "../helpers/web";

const UNKNOWN = `nobody-${Date.now()}@local.test`;

describe("login gives the same response for existing and unknown emails", () => {
  it("wrong password vs unknown account", async () => {
    const existing = await loginViaApp("staff@local.test", "wrong-password-xyz");
    const unknown = await loginViaApp(UNKNOWN, "wrong-password-xyz");
    expect(existing.res.status).toBe(unknown.res.status);
    expect(actionResult(existing.body)).toEqual(actionResult(unknown.body));
    expect(actionResult(existing.body)?.status).toBe("error");
    expect(existing.setCookies.some((c) => c.includes("auth-token=base64"))).toBe(false);
  });
});

describe("password reset gives the same response for existing and unknown emails", () => {
  it("existing vs unknown account", async () => {
    const call = (email: string) => callAction({ page: "/auth/reset", id: ACTIONS.requestReset(), fields: { email } });
    const a = await call("staff2@local.test");
    const b = await call(UNKNOWN);
    const ra = actionResult(await a.text());
    const rb = actionResult(await b.text());
    expect(a.status).toBe(b.status);
    expect(ra).not.toBeNull();
    expect(ra).toEqual(rb);
    expect(ra?.status).toBe("success");
  });
});
