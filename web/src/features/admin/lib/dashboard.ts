// Pure: admin_dashboard jsonb -> typed numbers, and links into the /admin/don-hang filters.
import { ROUTES } from "@/lib/routes";
import type { ProductionStep } from "@/lib/types";

/** Live workshop steps (0024); legacy steps only exist in the step log. */
export const OPEN_STEPS = ["cho_san_xuat", "dang_san_xuat", "san_sang_giao"] as const satisfies readonly ProductionStep[];
type OpenStep = (typeof OPEN_STEPS)[number];

export type AdminDashboard = {
  monthStart: string;
  orders: number; revenue: number; profit: number;
  openDebt: number; supplierDebt: number;
  overdue: number; dueSoon: number; pendingQuotes: number;
  notInWorkshop: number; newLeads: number;
  steps: Record<OpenStep, number>;
};

/** PostgREST numerics may arrive as strings; anything unreadable counts as 0. */
const n = (v: unknown) => {
  const x = typeof v === "number" ? v : Number(v);
  return Number.isFinite(x) ? x : 0;
};

export function toDashboard(raw: Record<string, unknown>): AdminDashboard {
  const steps = (raw.steps ?? {}) as Record<string, unknown>;
  return {
    monthStart: typeof raw.month_start === "string" ? raw.month_start : "",
    orders: n(raw.orders), revenue: n(raw.revenue), profit: n(raw.profit),
    openDebt: n(raw.open_debt), supplierDebt: n(raw.supplier_debt),
    overdue: n(raw.overdue), dueSoon: n(raw.due_soon), pendingQuotes: n(raw.pending_quotes),
    notInWorkshop: n(raw.not_in_workshop), newLeads: n(raw.new_leads),
    steps: Object.fromEntries(OPEN_STEPS.map((s) => [s, n(steps[s])])) as Record<OpenStep, number>,
  };
}

/** /admin/don-hang with list params (from, settled, due, step, delivered). */
export function ordersHref(params: Record<string, string>): string {
  const qs = new URLSearchParams(params).toString();
  return qs ? `${ROUTES.adminOrders}?${qs}` : ROUTES.adminOrders;
}
