// What the order list may show / do, from the shared permission rule (lib/auth/permissions.ts =
// SQL has_perm). UI hints only; the RPCs re-check.
import { hasPerm, type AccessProfile } from "@/lib/auth/permissions";

/** Plain object: passes to client components. */
export type ListPerms = { money: boolean; create: boolean; edit: boolean; status: boolean; delete: boolean; export: boolean };

export function listPerms(p: AccessProfile | null): ListPerms {
  return {
    money: hasPerm(p, "orders.money"), create: hasPerm(p, "orders.create"), edit: hasPerm(p, "orders.edit"),
    status: hasPerm(p, "orders.status"), delete: hasPerm(p, "orders.delete"), export: hasPerm(p, "orders.export"),
  };
}
