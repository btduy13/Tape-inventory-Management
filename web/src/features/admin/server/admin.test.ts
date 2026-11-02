import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types";
import { DEACTIVATED_BAN, inviteUser, updateUser } from "./users";
import { savePreset } from "./presets";
import { countByStatus } from "./queries";

type Db = SupabaseClient<Database>;
const USER = "0b0c0d0e-1111-4222-8333-444455556666";
const invite = { email: "new@x.vn", fullName: "Người Mới", role: "staff" as const };

function adminMock(opts: { inviteError?: object | null; metaError?: object | null; upsertError?: object | null } = {}) {
  const upsert = vi.fn().mockResolvedValue({ error: opts.upsertError ?? null });
  const authAdmin = {
    inviteUserByEmail: vi.fn().mockResolvedValue({ data: { user: opts.inviteError ? null : { id: USER } }, error: opts.inviteError ?? null }),
    updateUserById: vi.fn().mockResolvedValue({ data: {}, error: opts.metaError ?? null }),
    deleteUser: vi.fn().mockResolvedValue({ error: null }),
  };
  const db = { auth: { admin: authAdmin }, from: vi.fn(() => ({ upsert })) } as unknown as Db;
  return { db, authAdmin, upsert };
}

describe("inviteUser", () => {
  it("sets app_metadata.role and an active profile", async () => {
    const { db, authAdmin, upsert } = adminMock();
    expect(await inviteUser(db, invite, "http://localhost:3000/auth/callback")).toEqual({ ok: true, userId: USER });
    expect(authAdmin.inviteUserByEmail).toHaveBeenCalledWith("new@x.vn", { data: { full_name: "Người Mới" }, redirectTo: "http://localhost:3000/auth/callback" });
    expect(authAdmin.updateUserById).toHaveBeenCalledWith(USER, { app_metadata: { role: "staff" } });
    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({ id: USER, role: "staff", is_active: true }), { onConflict: "id" });
    expect(authAdmin.deleteUser).not.toHaveBeenCalled();
  });

  it("rolls back the auth user when the role cannot be stored", async () => {
    const a = adminMock({ metaError: { message: "x" } });
    expect(await inviteUser(a.db, invite, "u")).toEqual({ ok: false, reason: "generic" });
    expect(a.authAdmin.deleteUser).toHaveBeenCalledWith(USER);
    expect(a.upsert).not.toHaveBeenCalled();
    const b = adminMock({ upsertError: { code: "42501" } });
    expect(await inviteUser(b.db, invite, "u")).toEqual({ ok: false, reason: "generic" });
    expect(b.authAdmin.deleteUser).toHaveBeenCalledWith(USER);
  });

  it("reports existing email", async () => {
    const { db } = adminMock({ inviteError: { code: "email_exists", message: "A user with this email address has already been registered" } });
    expect(await inviteUser(db, invite, "u")).toEqual({ ok: false, reason: "exists" });
  });
});

describe("updateUser", () => {
  function userDb(result: { data: unknown; error: { code: string } | null }) {
    const update = vi.fn(() => ({ eq: () => ({ select: () => ({ maybeSingle: vi.fn().mockResolvedValue(result) }) }) }));
    return { db: { from: vi.fn(() => ({ update })) } as unknown as Db, update };
  }

  it("updates profile via RLS client, then bans deactivated users in Auth", async () => {
    const { db, update } = userDb({ data: { id: USER }, error: null });
    const { db: admin, authAdmin } = adminMock();
    expect(await updateUser(db, admin, { userId: USER, role: "ctv", isActive: false })).toEqual({ ok: true, authSynced: true });
    expect(update).toHaveBeenCalledWith({ role: "ctv", is_active: false });
    expect(authAdmin.updateUserById).toHaveBeenCalledWith(USER, { app_metadata: { role: "ctv" }, ban_duration: DEACTIVATED_BAN });
  });

  it("does not touch Auth when the guarded update fails", async () => {
    const { db } = userDb({ data: null, error: { code: "42501" } });
    const { db: admin, authAdmin } = adminMock();
    expect(await updateUser(db, admin, { userId: USER, role: "admin", isActive: true })).toEqual({ ok: false, reason: "forbidden" });
    expect(authAdmin.updateUserById).not.toHaveBeenCalled();
  });
});

describe("presets / overview", () => {
  const preset = { id: null, label: "48mm", widthMm: 48, lengthM: 100, thicknessMic: 45, sortOrder: 0, isActive: true };

  it("maps unique violation to duplicate", async () => {
    const db = { from: () => ({ insert: vi.fn().mockResolvedValue({ error: { code: "23505" } }) }) } as unknown as Db;
    expect(await savePreset(db, preset)).toEqual({ ok: false, reason: "duplicate" });
  });

  it("counts statuses", () => {
    const c = countByStatus([{ status: "new" }, { status: "new" }, { status: "done" }]);
    expect(c.new).toBe(2);
    expect(c.done).toBe(1);
    expect(c.cancelled).toBe(0);
  });
});

describe("page loaders report failed reads", () => {
  const chain = (result: { data: unknown; error: unknown }) => {
    const q: Record<string, unknown> = {};
    for (const k of ["select", "order"]) q[k] = vi.fn(() => q);
    q.maybeSingle = vi.fn().mockResolvedValue(result);
    q.then = (ok: (v: unknown) => unknown) => Promise.resolve(result).then(ok);
    return q;
  };

  it("loadUsers / loadPresets: rows on success, failed on error", async () => {
    const { loadUsers } = await import("./queries");
    const { loadPresets } = await import("./presets");
    const okDb = { from: () => chain({ data: [{ id: "u" }], error: null }) } as unknown as Db;
    const badDb = { from: () => chain({ data: null, error: { code: "42501" } }) } as unknown as Db;
    expect(await loadUsers(okDb)).toEqual({ rows: [{ id: "u" }], failed: false });
    expect(await loadUsers(badDb)).toEqual({ rows: [], failed: true });
    expect((await loadPresets(badDb)).failed).toBe(true);
  });

  it("loadTapeSpecs fails when either read fails", async () => {
    const { loadTapeSpecs } = await import("./tape-specs");
    let n = 0;
    const db = { from: () => chain(n++ === 0 ? { data: [], error: null } : { data: null, error: { code: "x" } }) } as unknown as Db;
    expect(await loadTapeSpecs(db)).toEqual({ widths: [], settings: null, failed: true });
  });
});
