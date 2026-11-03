// Shapes of the admin-only order RPCs (migration 0024). Admin pages only: these rows carry
// prices, costs, profit and customer contacts, so never pass them to workshop components.

/** Workshop steps an order job can be on (0024: 4 steps + cancelled). */
export const ORDER_STEPS = ["cho_san_xuat", "dang_san_xuat", "san_sang_giao", "da_giao", "huy"] as const;
export type OrderStep = (typeof ORDER_STEPS)[number];
/** Old steps kept only as history in production_step_log. */
export type LegacyStep = "dang_in" | "dang_cat_cuon" | "dong_goi";

/** Where an order came from: desktop app, admin web form, or a portal lead hand-off. */
export type OrderOrigin = "app" | "web" | "lead";

/** Row of rpc('admin_orders_list'). tong_tien / loi_nhuan_rong include the new axis. */
export type AdminOrderRow = {
  id: string;
  thoi_gian: string | null;
  ngay_du_kien: string | null;
  ten_hang: string | null;
  ten_khach_hang: string | null;
  sdt_khach_hang: string | null;
  dia_chi_khach_hang: string | null;
  so_luong: number | null;
  thanh_tien_ban: number;
  vat: number;
  tong_tien: number;
  tien_coc: number;
  cong_no_khach: number;
  loi_nhuan_rong: number;
  da_giao: boolean;
  da_tat_toan: boolean;
  job_id: string | null;
  step: OrderStep | null;
  workshop_user_id: string | null;
  workshop_user_name: string | null;
  lead_id: string | null;
  total_count: number;
};

export type AdminOrderJob = {
  id: string; lead_id: string | null; step: OrderStep; workshop_user_id: string | null;
  workshop_user_name: string | null; due_date: string | null; production_note: string | null;
  created_at: string; updated_at: string;
};

export type AdminOrderStepLog = {
  from_step: OrderStep | LegacyStep | null; to_step: OrderStep | LegacyStep;
  changed_by_name: string | null; note: string | null; created_at: string;
};

export type AdminDeliveryNote = {
  id: string; created_at: string; revoked_at: string | null; confirmed_at: string | null;
  recipient_name: string | null; recipient_phone: string | null; recipient_address: string | null;
  photo_path: string | null;
};

/** bang_keo_in_orders row as JSON (every column; the production table may have more). */
export type OrderRecord = Record<string, unknown> & { id: string };

/** rpc('admin_order_get'). */
export type AdminOrderDetail = {
  order: OrderRecord;
  job: AdminOrderJob | null;
  steps: AdminOrderStepLog[];
  delivery_notes: AdminDeliveryNote[];
};
