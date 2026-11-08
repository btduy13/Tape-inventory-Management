// Shapes of the admin-only customer RPCs (migration 0028). Admin pages only: they carry sales and debt.
import type { OrderType } from "./copy";

/** Row of rpc('admin_customers_list'): real orders only (no quotes) in the counts and money. */
export type CustomerRow = {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  company: string | null;
  note: string | null;
  order_count: number;
  tong_tien: number;
  cong_no_khach: number;
  last_order_at: string | null;
  total_count: number;
  sum_cong_no_khach: number;
};

export type Customer = Pick<CustomerRow, "id" | "name" | "phone" | "address" | "company" | "note">;

export type CustomerOrder = {
  type: OrderType;
  id: string;
  thoi_gian: string | null;
  ngay_du_kien: string | null;
  ten_hang: string | null;
  so_luong: number | null;
  tong_tien: number;
  cong_no_khach: number;
  da_giao: boolean;
  da_tat_toan: boolean;
  is_quote: boolean;
};

export type CustomerLead = {
  id: string;
  code: string;
  status: string;
  customer_name: string | null;
  phone: string | null;
  production_order_id: string | null;
  created_at: string;
};

/** rpc('admin_customer_get'). */
export type CustomerDetail = {
  customer: Customer;
  orders: CustomerOrder[];
  leads: CustomerLead[];
  totals: { order_count: number; tong_tien: number; cong_no_khach: number };
};

export type Suggestion = { id: string; name: string; phone: string | null; company: string | null; address: string | null };

/** Row of rpc('admin_customer_review_list'). */
export type ReviewRow = {
  source_table: string;
  order_type: OrderType | "lead";
  source_id: string;
  ten_khach_hang: string | null;
  sdt_khach_hang: string | null;
  dia_chi_khach_hang: string | null;
  thoi_gian: string | null;
  reason: string;
  suggestions: Suggestion[];
  /** Rows decided together (same name, no phone); group_ids oldest first. */
  group_size: number;
  group_ids: string[];
  total_count: number;
};
