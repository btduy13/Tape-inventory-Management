import "server-only";
import { assertRole, ForbiddenError } from "@/lib/auth/require-role";
import { ROLE_GROUPS } from "@/lib/auth/roles";
import type { Profile } from "@/lib/types";

/** Admin gate for Server Actions: returns null instead of throwing on 401/403. */
export async function adminOrNull(): Promise<Profile | null> {
  try {
    return await assertRole(ROLE_GROUPS.admin);
  } catch (e) {
    if (e instanceof ForbiddenError) return null;
    throw e;
  }
}
