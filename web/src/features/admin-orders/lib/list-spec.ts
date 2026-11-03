// URL-driven list of /admin/don-hang. Filtering and paging run in SQL (admin_orders_list);
// the spec only whitelists URL params. Order is fixed: newest first.
import { defineListSpec, type ListState } from "@/features/portal-ui/lib/list-params";
import { ORDER_STEPS } from "./types";

export const ORDERS_SPEC = defineListSpec({
  sort: { keys: { date: { column: "thoi_gian", firstDir: "desc" } }, default: { key: "date", dir: "desc" } },
  search: { columns: ["id", "ten_hang", "ten_khach_hang", "sdt_khach_hang"] },
  filters: {
    step: { kind: "enum", column: "step", values: [...ORDER_STEPS, "none"] },
    delivered: { kind: "bool", column: "da_giao" },
    settled: { kind: "bool", column: "da_tat_toan" },
  },
  dateRange: { column: "thoi_gian", type: "date" },
  pageSizes: [25, 50, 100],
});

const bool = (v: string[] | undefined) => (v?.[0] === "1" ? true : v?.[0] === "0" ? false : undefined);

/** List state -> admin_orders_list filter (keys the SQL knows, nothing else). */
export function toOrdersFilter(state: ListState) {
  return {
    ...(state.q ? { q: state.q } : {}),
    ...(state.filters.step?.[0] ? { step: state.filters.step[0] } : {}),
    ...(bool(state.filters.delivered) !== undefined ? { delivered: bool(state.filters.delivered) } : {}),
    ...(bool(state.filters.settled) !== undefined ? { settled: bool(state.filters.settled) } : {}),
    ...(state.from ? { date_from: state.from } : {}),
    ...(state.to ? { date_to: state.to } : {}),
    limit: state.pageSize,
    offset: (state.page - 1) * state.pageSize,
  };
}
