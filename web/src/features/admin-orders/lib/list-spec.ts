// URL-driven list of /admin/don-hang. Filtering, sorting, totals and paging run in SQL
// (admin_orders_list); the spec only whitelists URL params.
import { defineListSpec, type ListState } from "@/features/portal-ui/lib/list-params";
import { addDays } from "@/features/workshop/lib/dates";
import { BOARD_STEPS } from "@/features/workshop/lib/steps";
import { ORDER_TYPES, type OrderType } from "./types";

/** Tabs: the 4 order types, app quotes (every type, is_quote) and every order type together (the
 *  overview KPIs count all 4 tables). Printed tape has no URL value. */
export const ORDER_TABS = [...ORDER_TYPES, "quote", "all"] as const;
export type OrderTab = (typeof ORDER_TABS)[number];

/** Sort keys are the admin_orders_list sort names. */
const desc = { firstDir: "desc" } as const;
export const ORDERS_SPEC = defineListSpec({
  sort: {
    keys: {
      thoi_gian: { column: "thoi_gian", ...desc }, ngay_du_kien: { column: "ngay_du_kien" }, id: { column: "id", ...desc },
      ten_hang: { column: "ten_hang" }, ten_khach_hang: { column: "ten_khach_hang" }, so_luong: { column: "so_luong", ...desc },
      tong_tien: { column: "tong_tien", ...desc }, cong_no_khach: { column: "cong_no_khach", ...desc },
      loi_nhuan_rong: { column: "loi_nhuan_rong", ...desc },
    },
    default: { key: "thoi_gian", dir: "desc" },
  },
  search: { columns: ["id", "ten_hang", "ten_khach_hang", "sdt_khach_hang"] },
  filters: {
    type: { kind: "enum", column: "type", values: ORDER_TABS },
    step: { kind: "enum", column: "step", values: [...BOARD_STEPS, "none"] },
    delivered: { kind: "bool", column: "da_giao" },
    settled: { kind: "bool", column: "da_tat_toan" },
    due: { kind: "enum", column: "ngay_du_kien", values: ["overdue", "soon"] },
  },
  dateRange: { column: "thoi_gian", type: "date" },
  pageSizes: [25, 50, 100],
});

export function tabOf(state: ListState): OrderTab {
  return (state.filters.type?.[0] as OrderTab | undefined) ?? "bang_keo_in";
}

const bool = (v: string[] | undefined) => (v?.[0] === "1" ? true : v?.[0] === "0" ? false : undefined);

export type OrdersFilter = {
  q?: string; is_quote?: boolean; step?: string; delivered?: boolean; settled?: boolean; due?: string;
  date_from?: string; date_to?: string; sort: string; dir: "asc" | "desc"; limit: number; offset: number;
};

/** List state -> admin_orders_list (p_type, p_filter): keys the SQL knows, nothing else. */
export function toOrdersQuery(state: ListState): { type: OrderType | "all"; filter: OrdersFilter } {
  const tab = tabOf(state);
  const quote = tab === "quote";
  const f = state.filters;
  return {
    type: quote ? "all" : tab,
    filter: {
      ...(state.q ? { q: state.q } : {}),
      ...(quote ? { is_quote: true } : {}),
      // Only printed tape goes to the workshop; quotes are never delivered or settled.
      ...(tab === "bang_keo_in" && f.step?.[0] ? { step: f.step[0] } : {}),
      ...(!quote && bool(f.delivered) !== undefined ? { delivered: bool(f.delivered) } : {}),
      ...(!quote && bool(f.settled) !== undefined ? { settled: bool(f.settled) } : {}),
      ...(!quote && f.due?.[0] ? { due: f.due[0] } : {}),
      ...(state.from ? { date_from: state.from } : {}),
      ...(state.to ? { date_to: state.to } : {}),
      sort: state.sort,
      dir: state.dir,
      limit: state.pageSize,
      offset: (state.page - 1) * state.pageSize,
    },
  };
}

export type DueTone = "overdue" | "soon" | null;

/** Same rule as admin_orders_list: undelivered and due before today / within 3 days. */
export function dueTone(due: string | null, delivered: boolean, isQuote: boolean, today: string): DueTone {
  if (!due || delivered || isQuote) return null;
  const d = due.slice(0, 10);
  if (d < today) return "overdue";
  return d <= addDays(today, 3) ? "soon" : null;
}
