// Pure role helpers (safe for client + server). Mirrors SQL helpers in migration 0001.
import type { AppRole, Profile } from "@/lib/types";

export const ROLE_GROUPS = {
  /** Sees all leads, manages users, assigns, edits presets, converts to production. */
  admin: ["admin"],
  /** Can set prices and send quotes; sees all leads. */
  pricing: ["admin", "manager"],
  /** Sees only leads assigned to them. */
  field: ["staff", "ctv"],
  /** Any internal (sales / office) user: lead portal. Excludes the workshop. */
  internal: ["admin", "manager", "staff", "ctv"],
  /** Production floor users: only their assigned production jobs (/portal/xuong). */
  workshop: ["workshop"],
  /** Workshop dashboard, "Chuyển sang sản xuất", production steps (SQL re-checks assignment). */
  production: ["admin", "workshop"],
  /** Anyone who may enter /portal at all (layout gate). */
  portal: ["admin", "manager", "staff", "ctv", "workshop"],
} as const satisfies Record<string, readonly AppRole[]>;

export function hasRole(profile: Pick<Profile, "role" | "is_active"> | null, allowed: readonly AppRole[]): boolean {
  return !!profile && profile.is_active && allowed.includes(profile.role);
}

export const canManagePrices = (p: Pick<Profile, "role" | "is_active"> | null) => hasRole(p, ROLE_GROUPS.pricing);
export const canAssign = (p: Pick<Profile, "role" | "is_active"> | null) => hasRole(p, ROLE_GROUPS.admin);
export const seesAllLeads = (p: Pick<Profile, "role" | "is_active"> | null) => hasRole(p, ROLE_GROUPS.pricing);
