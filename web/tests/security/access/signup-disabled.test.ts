// Rule: public sign-up is disabled. Accounts are created only by an admin invite (service role).
import { describe, expect, it } from "vitest";
import { looseService } from "../helpers/lead-fixtures";
import { looseAnon } from "../helpers/sessions";

async function profileByEmail(email: string) {
  const { data } = await looseService().from("profiles").select("id").eq("email", email);
  return data ?? [];
}

describe("public sign-up is disabled", () => {
  it("email + password sign-up is rejected and creates no account", async () => {
    const email = `sec-signup-${Date.now()}@security.local.test`;
    const { data, error } = await looseAnon().auth.signUp({ email, password: "Sec-signup-12345" });
    expect(error).not.toBeNull();
    expect(data.session).toBeNull();
    expect(await profileByEmail(email)).toEqual([]);
  });

  it("sign-up with a forged app_metadata role in user data is rejected", async () => {
    const email = `sec-signup-role-${Date.now()}@security.local.test`;
    const { error } = await looseAnon().auth.signUp({
      email,
      password: "Sec-signup-12345",
      options: { data: { role: "admin", full_name: "x" } },
    });
    expect(error).not.toBeNull();
    expect(await profileByEmail(email)).toEqual([]);
  });

  it("anonymous sign-in is disabled", async () => {
    const { data, error } = await looseAnon().auth.signInAnonymously();
    expect(error).not.toBeNull();
    expect(data.session).toBeNull();
  });

  it("OTP / magic link cannot create a new user", async () => {
    const email = `sec-otp-${Date.now()}@security.local.test`;
    await looseAnon().auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
    expect(await profileByEmail(email)).toEqual([]);
  });

  it("the admin user API is not reachable with the anon key", async () => {
    const { error } = await looseAnon().auth.admin.createUser({
      email: `sec-admin-api-${Date.now()}@security.local.test`,
      password: "Sec-signup-12345",
    });
    expect(error).not.toBeNull();
  });
});
