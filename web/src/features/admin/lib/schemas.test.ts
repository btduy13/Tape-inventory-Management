import { describe, expect, it } from "vitest";
import { inviteSchema, isSelfLockout, presetSchema, updateUserSchema } from "./schemas";

const ID = "0b0c0d0e-1111-4222-8333-444455556666";

describe("admin schemas", () => {
  it("invite requires a valid role", () => {
    expect(inviteSchema.safeParse({ email: "a@b.vn", fullName: "A", role: "superuser" }).success).toBe(false);
    expect(inviteSchema.parse({ email: " A@B.VN ", fullName: " A ", role: "ctv" })).toEqual({ email: "a@b.vn", fullName: "A", role: "ctv" });
  });

  it("checkbox parsing", () => {
    expect(updateUserSchema.parse({ userId: ID, role: "staff", isActive: "on" }).isActive).toBe(true);
    expect(updateUserSchema.parse({ userId: ID, role: "staff" }).isActive).toBe(false);
  });

  it("self-lockout guard", () => {
    expect(isSelfLockout({ id: ID }, { userId: ID, role: "manager", isActive: true })).toBe(true);
    expect(isSelfLockout({ id: ID }, { userId: ID, role: "admin", isActive: false })).toBe(true);
    expect(isSelfLockout({ id: ID }, { userId: ID, role: "admin", isActive: true })).toBe(false);
    expect(isSelfLockout({ id: "other" }, { userId: ID, role: "ctv", isActive: false })).toBe(false);
  });

  it("preset numbers are coerced, bounded and rounded", () => {
    const p = presetSchema.parse({ id: "", label: "x", widthMm: "48.04", lengthM: "100", thicknessMic: "45", sortOrder: "3", isActive: "on" });
    expect(p).toMatchObject({ id: null, widthMm: 48, lengthM: 100, thicknessMic: 45, sortOrder: 3, isActive: true });
    expect(presetSchema.safeParse({ label: "x", widthMm: "0", lengthM: "1", thicknessMic: "1" }).success).toBe(false);
    expect(presetSchema.safeParse({ label: "x", widthMm: "201", lengthM: "1", thicknessMic: "1" }).success).toBe(false);
    expect(presetSchema.safeParse({ label: "x", widthMm: "abc", lengthM: "1", thicknessMic: "1" }).success).toBe(false);
  });
});
