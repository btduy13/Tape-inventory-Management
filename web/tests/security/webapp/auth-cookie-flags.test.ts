// Rule: Supabase auth cookies set by the app are HttpOnly and SameSite (Lax/Strict),
// and Secure in a production build. (localhost counts as a secure context, so browsers
// accept Secure cookies there too; a production build has no reason to omit it.)
import { beforeAll, describe, expect, it } from "vitest";
import { loginViaApp } from "../helpers/web";

function attrs(cookie: string): Map<string, string> {
  const m = new Map<string, string>();
  for (const part of cookie.split(";").slice(1)) {
    const [k, ...v] = part.trim().split("=");
    m.set(k!.toLowerCase(), v.join("="));
  }
  return m;
}

describe("auth cookies are HttpOnly, SameSite and Secure in production", () => {
  let authCookies: string[] = [];
  beforeAll(async () => {
    const r = await loginViaApp("staff@local.test", "devpassword123");
    authCookies = r.setCookies.filter((c) => /^sb-[^=]*auth-token/.test(c));
  });

  it("login sets an auth cookie", () => {
    expect(authCookies.length).toBeGreaterThan(0);
  });
  it("auth cookies are HttpOnly", () => {
    for (const c of authCookies) expect(attrs(c).has("httponly"), c.split("=")[0]).toBe(true);
  });
  it("auth cookies are SameSite=Lax or Strict", () => {
    for (const c of authCookies) {
      expect(["lax", "strict"]).toContain((attrs(c).get("samesite") ?? "").toLowerCase());
    }
  });
  it("auth cookies are Secure in a production build", () => {
    for (const c of authCookies) expect(attrs(c).has("secure"), c.split("=")[0]).toBe(true);
  });
});
