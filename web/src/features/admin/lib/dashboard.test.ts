import { describe, expect, it } from "vitest";
import { ordersHref, toDashboard } from "./dashboard";

describe("toDashboard", () => {
  it("reads admin_dashboard jsonb, numerics as strings included", () => {
    const d = toDashboard({
      month_start: "2026-11-01", orders: 3, revenue: "18000", profit: 5700, open_debt: "19500.5",
      supplier_debt: 10500, overdue: 1, due_soon: 1, pending_quotes: 2, not_in_workshop: 21, new_leads: 4,
      steps: { cho_san_xuat: 2, san_sang_giao: "1", dang_in: 9 },
    });
    expect(d).toEqual({
      monthStart: "2026-11-01", orders: 3, revenue: 18000, profit: 5700, openDebt: 19500.5, supplierDebt: 10500,
      overdue: 1, dueSoon: 1, pendingQuotes: 2, notInWorkshop: 21, newLeads: 4,
      steps: { cho_san_xuat: 2, dang_san_xuat: 0, san_sang_giao: 1 },
    });
  });

  it("missing or bad values count as 0", () => {
    const d = toDashboard({ revenue: "abc", steps: null });
    expect(d.revenue).toBe(0);
    expect(d.orders).toBe(0);
    expect(d.monthStart).toBe("");
    expect(d.steps.cho_san_xuat).toBe(0);
  });
});

describe("ordersHref", () => {
  it("links into the order list filters", () => {
    expect(ordersHref({})).toBe("/admin/don-hang");
    expect(ordersHref({ step: "none", delivered: "0" })).toBe("/admin/don-hang?step=none&delivered=0");
    expect(ordersHref({ from: "2026-11-01" })).toBe("/admin/don-hang?from=2026-11-01");
  });
});
