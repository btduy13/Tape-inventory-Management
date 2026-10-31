import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types";
import { performLogin, requestPasswordReset, updatePassword } from "./login";

type Db = SupabaseClient<Database>;

function mockDb(opts: {
  signIn?: { user: { id: string } | null; error?: { status?: number } | null };
  profile?: { id: string; is_active: boolean } | null;
  profileError?: unknown;
}) {
  const signOut = vi.fn().mockResolvedValue({ error: null });
  const maybeSingle = vi.fn().mockResolvedValue({ data: opts.profile ?? null, error: opts.profileError ?? null });
  const db = {
    auth: {
      signInWithPassword: vi.fn().mockResolvedValue({
        data: { user: opts.signIn?.user ?? null },
        error: opts.signIn?.error ?? null,
      }),
      signOut,
    },
    from: vi.fn(() => ({ select: () => ({ eq: () => ({ maybeSingle }) }) })),
  };
  return { db: db as unknown as Db, signOut };
}

describe("performLogin", () => {
  it("ok for active profile", async () => {
    const { db, signOut } = mockDb({ signIn: { user: { id: "u1" } }, profile: { id: "u1", is_active: true } });
    expect(await performLogin(db, "a@b.vn", "pw")).toBe("ok");
    expect(signOut).not.toHaveBeenCalled();
  });

  it("invalid credentials do not leak details", async () => {
    const { db } = mockDb({ signIn: { user: null, error: { status: 400 } } });
    expect(await performLogin(db, "a@b.vn", "pw")).toBe("invalid");
  });

  it("server errors map to error", async () => {
    const { db } = mockDb({ signIn: { user: null, error: { status: 503 } } });
    expect(await performLogin(db, "a@b.vn", "pw")).toBe("error");
  });

  it("inactive or missing profile signs out again", async () => {
    const a = mockDb({ signIn: { user: { id: "u1" } }, profile: { id: "u1", is_active: false } });
    expect(await performLogin(a.db, "a@b.vn", "pw")).toBe("disabled");
    expect(a.signOut).toHaveBeenCalled();
    const b = mockDb({ signIn: { user: { id: "u1" } }, profile: null });
    expect(await performLogin(b.db, "a@b.vn", "pw")).toBe("disabled");
    expect(b.signOut).toHaveBeenCalled();
  });
});

describe("password reset", () => {
  it("swallows errors (no account enumeration)", async () => {
    const db = { auth: { resetPasswordForEmail: vi.fn().mockRejectedValue(new Error("nope")) } } as unknown as Db;
    await expect(requestPasswordReset(db, "x@y.vn", "http://localhost/cb")).resolves.toBeUndefined();
  });

  it("updatePassword requires a session", async () => {
    const updateUser = vi.fn().mockResolvedValue({ error: null });
    const none = { auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }), updateUser } } as unknown as Db;
    expect(await updatePassword(none, "longenough")).toBe("no-session");
    expect(updateUser).not.toHaveBeenCalled();
    const some = { auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "u" } } }), updateUser } } as unknown as Db;
    expect(await updatePassword(some, "longenough")).toBe("ok");
  });
});
