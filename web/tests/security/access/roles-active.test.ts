// Rule: only admin changes a profile's role or active flag (never their own to lock out).
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ensureUser, fixtureActor, looseService } from "../helpers/lead-fixtures";
import { seedActor, type Actor } from "../helpers/sessions";

let target: { id: string; email: string };

async function profileOf(id: string) {
  const { data } = await looseService().from("profiles").select("role, is_active, email").eq("id", id).single();
  return data as { role: string; is_active: boolean; email: string };
}

beforeAll(async () => {
  target = await ensureUser("access-role-target", "staff");
});
afterAll(async () => {
  await ensureUser("access-role-target", "staff");
});

describe("non-admins cannot change another user's role or active flag", () => {
  for (const role of ["manager", "staff", "staff2", "ctv"] as const) {
    it(`${role} cannot promote or deactivate another account`, async () => {
      const actor = await seedActor(role);
      await actor.db.from("profiles").update({ role: "admin" }).eq("id", target.id);
      await actor.db.from("profiles").update({ is_active: false }).eq("id", target.id);
      expect(await profileOf(target.id)).toMatchObject({ role: "staff", is_active: true });
    });
  }
});

describe("non-admins cannot change their own role, active flag or email", () => {
  for (const role of ["manager", "staff", "ctv"] as const) {
    it(`${role} self-promotion to admin is rejected`, async () => {
      const self: Actor = await fixtureActor(`access-role-self-${role}`, role);
      const { error } = await self.db.from("profiles").update({ role: "admin" }).eq("id", self.id).select("id");
      expect(error?.code).toBe("42501");
      expect((await profileOf(self.id)).role).toBe(role);
    });
  }

  it("staff cannot change own is_active or email, but can edit own name (control)", async () => {
    const self = await fixtureActor("access-role-self-staff", "staff");
    const a = await self.db.from("profiles").update({ is_active: false }).eq("id", self.id).select("id");
    const b = await self.db.from("profiles").update({ email: "evil@example.com" }).eq("id", self.id).select("id");
    expect(a.error?.code).toBe("42501");
    expect(b.error?.code).toBe("42501");
    expect(await profileOf(self.id)).toMatchObject({ is_active: true, email: self.email });
    const ok = await self.db.from("profiles").update({ full_name: "Security self" }).eq("id", self.id).select("id");
    expect(ok.error).toBeNull();
    expect(ok.data).toHaveLength(1);
  });
});

describe("admin changes roles and active flags", () => {
  it("admin can change another user's role and active flag", async () => {
    const admin = await seedActor("admin");
    const r1 = await admin.db.from("profiles").update({ role: "ctv", is_active: false }).eq("id", target.id).select("id");
    expect(r1.error).toBeNull();
    expect(await profileOf(target.id)).toMatchObject({ role: "ctv", is_active: false });
    const r2 = await admin.db.from("profiles").update({ role: "staff", is_active: true }).eq("id", target.id).select("id");
    expect(r2.error).toBeNull();
    expect(await profileOf(target.id)).toMatchObject({ role: "staff", is_active: true });
  });

  it("an admin cannot demote or deactivate their own account", async () => {
    const admin2 = await fixtureActor("access-role-admin2", "admin");
    const a = await admin2.db.from("profiles").update({ role: "staff" }).eq("id", admin2.id).select("id");
    const b = await admin2.db.from("profiles").update({ is_active: false }).eq("id", admin2.id).select("id");
    expect(a.error?.code).toBe("42501");
    expect(b.error?.code).toBe("42501");
    expect(await profileOf(admin2.id)).toMatchObject({ role: "admin", is_active: true });
  });

  it("nobody can insert or delete profiles through the API", async () => {
    for (const role of ["admin", "manager", "staff"] as const) {
      const actor = await seedActor(role);
      const ins = await actor.db
        .from("profiles")
        .insert({ id: "00000000-0000-0000-0000-0000000fffff", role: "admin", email: "x@example.com" })
        .select("id");
      expect(ins.error, role).not.toBeNull();
      await actor.db.from("profiles").delete().eq("id", target.id);
    }
    expect(await profileOf(target.id)).toBeTruthy();
  });
});
