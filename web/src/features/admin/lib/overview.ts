// Pure: admin_overview jsonb (0034) -> typed data, month-over-month deltas, links into the filtered
// lists (/admin/don-hang list-spec params, /portal lead list params).
import { ROUTES } from "@/lib/routes";
import { isOrderType, type OrderType } from "@/features/admin-orders/lib/types";

/** Undelivered printed-tape orders per workshop step; none = no job yet (0024 live steps). */
export const PIPE_STEPS = ["none", "cho_san_xuat", "dang_san_xuat", "san_sang_giao"] as const;
export type PipeStep = (typeof PIPE_STEPS)[number];
/** Chart stack order (bottom up). */
export const CHART_TYPES = ["bang_keo_in", "truc_in", "bang_keo", "thank_you"] as const satisfies readonly OrderType[];

export type MonthRow = { month: string; profit: number | null } & Record<OrderType, number>;
export type Overview = {
  money: boolean; today: string; monthStart: string; prevMonthStart: string;
  attention: { overdue: number; dueSoon: number; notInWorkshop: number; leadsNew: number; leadsConsulting: number; leadsQuoted: number };
  kpi: {
    revenue: number; revenuePrev: number; profit: number | null; profitPrev: number | null;
    customerDebt: number; customerDebtNew: number; customerDebtNewPrev: number;
    supplierDebt: number | null; supplierDebtNew: number | null; supplierDebtNewPrev: number | null;
  };
  pipeline: Record<PipeStep, number>;
  months: MonthRow[];
  overdueList: { type: OrderType; id: string; customer: string; due: string; daysLate: number }[];
  topDebtors: { name: string; debt: number; orders: number }[];
};

type Raw = Record<string, unknown>;
/** PostgREST numerics may arrive as strings; anything unreadable counts as 0. */
const n = (v: unknown) => {
  const x = typeof v === "number" ? v : Number(v);
  return Number.isFinite(x) ? x : 0;
};
/** Cost-side money is null without orders.money: keep the null. */
const nn = (v: unknown) => (v === null || v === undefined ? null : n(v));
const s = (v: unknown) => (typeof v === "string" ? v : "");
const obj = (v: unknown): Raw => (v && typeof v === "object" && !Array.isArray(v) ? (v as Raw) : {});
const arr = (v: unknown): Raw[] => (Array.isArray(v) ? v.map(obj) : []);

export function toOverview(raw: Raw): Overview {
  const a = obj(raw.attention), k = obj(raw.kpi), p = obj(raw.pipeline), l = obj(raw.leads);
  return {
    money: raw.money === true, today: s(raw.today), monthStart: s(raw.month_start), prevMonthStart: s(raw.prev_month_start),
    attention: {
      overdue: n(a.overdue), dueSoon: n(a.due_soon), notInWorkshop: n(a.not_in_workshop),
      leadsNew: n(l.new), leadsConsulting: n(l.consulting), leadsQuoted: n(l.quoted),
    },
    kpi: {
      revenue: n(k.revenue), revenuePrev: n(k.revenue_prev), profit: nn(k.profit), profitPrev: nn(k.profit_prev),
      customerDebt: n(k.customer_debt), customerDebtNew: n(k.customer_debt_new), customerDebtNewPrev: n(k.customer_debt_new_prev),
      supplierDebt: nn(k.supplier_debt), supplierDebtNew: nn(k.supplier_debt_new), supplierDebtNewPrev: nn(k.supplier_debt_new_prev),
    },
    pipeline: Object.fromEntries(PIPE_STEPS.map((st) => [st, n(p[st])])) as Record<PipeStep, number>,
    months: arr(raw.months).map((m) => ({
      month: s(m.month), profit: nn(m.profit),
      bang_keo_in: n(m.bang_keo_in), truc_in: n(m.truc_in), bang_keo: n(m.bang_keo), thank_you: n(m.thank_you),
    })),
    overdueList: arr(raw.overdue_list).filter((o) => isOrderType(o.type)).map((o) => ({
      type: o.type as OrderType, id: s(o.id), customer: s(o.ten_khach_hang), due: s(o.ngay_du_kien), daysLate: n(o.days_late),
    })),
    topDebtors: arr(raw.top_debtors).map((d) => ({ name: s(d.name), debt: n(d.debt), orders: n(d.orders) })),
  };
}

export type Delta = { pct: number | null; dir: "up" | "down" | "flat"; tone: "good" | "bad" | "neutral" };

/** Change vs last month. pct null when last month is 0 (no "∞%"); tone by good / bad, not by up / down. */
export function delta(cur: number, prev: number, upIsGood: boolean): Delta {
  const dir = cur > prev ? "up" : cur < prev ? "down" : "flat";
  const tone = dir === "flat" ? "neutral" : (dir === "up") === upIsGood ? "good" : "bad";
  return { pct: prev === 0 ? null : ((cur - prev) / Math.abs(prev)) * 100, dir, tone };
}

/** "2026-11" -> "T11"; January carries the year ("T1/26") so a 12-month axis reads across new year. */
export function monthLabel(month: string): string {
  const [y, m] = month.split("-");
  return Number(m) === 1 ? `T1/${(y ?? "").slice(2)}` : `T${Number(m)}`;
}

const href = (path: string, params: Record<string, string>) => {
  const qs = new URLSearchParams(params).toString();
  return qs ? `${path}?${qs}` : path;
};
/** /admin/don-hang with ORDERS_SPEC params (type, step, delivered, settled, due, from, q, sort, dir). */
export const ordersHref = (params: Record<string, string>) => href(ROUTES.adminOrders, params);
/** Lead list (/portal) with leadListSpec params (status, assignee). */
export const leadsHref = (params: Record<string, string>) => href(ROUTES.portal, params);

/** Step filter only applies on the printed-tape tab (the default, no type param). */
export const pipelineHref = (step: PipeStep) => ordersHref({ step, delivered: "0" });
