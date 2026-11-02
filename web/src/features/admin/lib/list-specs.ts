// URL-driven list specs for the admin settings pages (users, widths, presets).
// Lists are small, so pages filter / sort in memory (applyListInMemory) after an RLS read.
import { defineListSpec, type ListSpec, type ListState } from "@/features/portal-ui/lib/list-params";
import { ROLES } from "@/lib/types";

export const USERS_SPEC = defineListSpec({
  sort: {
    keys: {
      name: { column: "full_name" },
      email: { column: "email" },
      role: { column: "role_rank" },
      status: { column: "is_active", firstDir: "desc" },
      created: { column: "created_at", firstDir: "desc" },
    },
    default: { key: "role", dir: "asc" },
    tiebreak: "full_name",
  },
  search: { columns: ["full_name", "email", "phone"] },
  filters: {
    role: { kind: "enum", column: "role", values: ROLES },
    active: { kind: "bool", column: "is_active" },
  },
  pageSizes: [25, 50, 100],
});

export const WIDTHS_SPEC = defineListSpec({
  sort: {
    keys: { order: { column: "sort_order" }, width: { column: "width_mm" } },
    default: { key: "order", dir: "asc" },
    tiebreak: "width_mm",
  },
  search: { columns: ["width_mm"], maxLength: 10 },
  filters: { active: { kind: "bool", column: "is_active" } },
  pageSizes: [50, 100],
});

export const PRESETS_SPEC = defineListSpec({
  sort: {
    keys: {
      order: { column: "sort_order" },
      label: { column: "label" },
      width: { column: "width_mm" },
      updated: { column: "updated_at", firstDir: "desc" },
    },
    default: { key: "order", dir: "asc" },
    tiebreak: "width_mm",
  },
  search: { columns: ["label"] },
  filters: { active: { kind: "bool", column: "is_active" } },
  pageSizes: [25, 50, 100],
});

/** Up / down only make sense when the list shows the real display order, unfiltered. */
export function canReorder(spec: ListSpec, state: ListState): boolean {
  return (
    state.sort === spec.sort.default.key &&
    state.dir === "asc" &&
    !state.q &&
    Object.keys(state.filters).length === 0 &&
    state.page === 1
  );
}

/** Role column sorts by the ROLES order (admin first), not alphabetically. */
export function withRoleRank<T extends { role: (typeof ROLES)[number] }>(rows: readonly T[]): (T & { role_rank: number })[] {
  return rows.map((r) => ({ ...r, role_rank: ROLES.indexOf(r.role) }));
}
