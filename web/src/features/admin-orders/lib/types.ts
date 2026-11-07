// Shapes of the admin-only order RPCs (migrations 0024, 0026, 0028). Admin pages only: these rows
// carry prices, costs, profit and customer contacts, so never pass them to workshop components.
import type { ProductionStep } from "@/lib/types";

/** RPC p_type values (0026). bang_keo_in = printed tape, the only type that goes to the workshop. */
export const ORDER_TYPES = ["bang_keo_in", "bang_keo", "truc_in", "thank_you"] as const;
export type OrderType = (typeof ORDER_TYPES)[number];

export const isOrderType = (v: unknown): v is OrderType => (ORDER_TYPES as readonly unknown[]).includes(v);

/** Where an order came from: desktop app, admin web form, or a portal lead hand-off. */
export type OrderOrigin = "app" | "web" | "lead";

/** Row of rpc('admin_orders_list'). tong_tien / tien_von / loi_nhuan_rong include the new axis.
 *  The sum_* / count_* totals cover the whole filtered set and repeat on every row. */
export type AdminOrderRow = {
  type: OrderType;
  id: string;
  thoi_gian: string | null;
  ngay_du_kien: string | null;
  ten_hang: string | null;
  quy_cach: string | null;
  mau_sac: string | null;
  ten_khach_hang: string | null;
  sdt_khach_hang: string | null;
  dia_chi_khach_hang: string | null;
  so_luong: number | null;
  don_gia_ban: number;
  thanh_tien_ban: number;
  vat: number;
  tong_tien: number;
  tien_coc: number;
  cong_no_khach: number;
  cong_no_ncc: number;
  tien_von: number;
  loi_nhuan_rong: number;
  ctv: string | null;
  da_giao: boolean;
  da_tat_toan: boolean;
  da_gui_email: boolean;
  is_quote: boolean;
  has_quote_items: boolean;
  job_id: string | null;
  step: ProductionStep | null;
  workshop_user_id: string | null;
  workshop_user_name: string | null;
  lead_id: string | null;
  total_count: number;
  sum_tong_tien: number;
  sum_cong_no_khach: number;
  sum_cong_no_ncc: number;
  sum_loi_nhuan_rong: number;
  count_due_soon: number;
  count_overdue: number;
};

export type OrdersTotals = {
  count: number; tongTien: number; congNoKhach: number; congNoNcc: number; loiNhuanRong: number;
  dueSoon: number; overdue: number;
};

export type AdminOrderJob = {
  id: string; lead_id: string | null; step: ProductionStep; workshop_user_id: string | null;
  workshop_user_name: string | null; due_date: string | null; production_note: string | null;
  created_at: string; updated_at: string;
};

export type AdminOrderStepLog = {
  from_step: ProductionStep | null; to_step: ProductionStep;
  changed_by_name: string | null; note: string | null; created_at: string;
};

export type AdminDeliveryNote = {
  id: string; created_at: string; revoked_at: string | null; confirmed_at: string | null;
  recipient_name: string | null; recipient_phone: string | null; recipient_address: string | null;
  photo_path: string | null;
};

/** Order row as JSON (every column of its table; production tables may have more). */
export type OrderRecord = Record<string, unknown> & { id: string };

/** rpc('admin_order_get'). */
export type AdminOrderDetail = {
  type: OrderType;
  order: OrderRecord;
  job: AdminOrderJob | null;
  steps: AdminOrderStepLog[];
  delivery_notes: AdminDeliveryNote[];
};

/** What the list / detail actions need to know about one order. */
export type OrderRef = {
  type: OrderType; id: string; isQuote: boolean; delivered: boolean; settled: boolean; hasJob: boolean;
};

/** Customer picker row (admin_customers_list subset). */
export type CustomerHit = { id: string; name: string; phone: string | null; address: string | null; company: string | null };

/** A multi-size quote / converted order: money is frozen (app.js configureStructuredOrderEdit). */
export function hasQuoteItems(order: OrderRecord): boolean {
  return Array.isArray(order.quote_items) && order.quote_items.length > 0;
}
