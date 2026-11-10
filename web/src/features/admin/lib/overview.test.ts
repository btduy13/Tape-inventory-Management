import { describe, expect, it } from "vitest";
import { vndShort } from "@/features/admin-orders/lib/format";
import { delta, leadsHref, monthLabel, ordersHref, pipelineHref, toOverview } from "./overview";

describe("toOverview", () => {
  it("reads admin_overview jsonb, numerics as strings, cost side null kept", () => {
    const o = toOverview({
      money: false, today: "2026-11-09", month_start: "2026-11-01", prev_month_start: "2026-10-01",
      attention: { overdue: 2, due_soon: "1", not_in_workshop: 0 },
      leads: { new: 1, consulting: 0, quoted: 3 },
      kpi: { revenue: "18000", revenue_prev: 2000, profit: null, customer_debt: 19500.5, supplier_debt: null },
      pipeline: { none: 1, cho_san_xuat: "4", dang_in: 9 },
      months: [{ month: "2026-11", bang_keo_in: "12000", thank_you: 5000, profit: null }],
      overdue_list: [{ type: "truc_in", id: "TI-1", ten_khach_hang: "A", ngay_du_kien: "2026-11-01", days_late: 8 }, { type: "x", id: "bad" }],
      top_debtors: [{ name: "Khách A", debt: "120000000", orders: 3 }],
    });
    expect(o.money).toBe(false);
    expect(o.attention).toEqual({ overdue: 2, dueSoon: 1, notInWorkshop: 0, leadsNew: 1, leadsConsulting: 0, leadsQuoted: 3 });
    expect(o.kpi.revenue).toBe(18000);
    expect(o.kpi.profit).toBeNull();
    expect(o.kpi.supplierDebt).toBeNull();
    expect(o.kpi.customerDebt).toBe(19500.5);
    expect(o.pipeline).toEqual({ none: 1, cho_san_xuat: 4, dang_san_xuat: 0, da_san_xuat: 0, san_sang_giao: 0 });
    expect(o.months).toEqual([{ month: "2026-11", bang_keo_in: 12000, truc_in: 0, bang_keo: 0, thank_you: 5000, profit: null }]);
    expect(o.overdueList).toEqual([{ type: "truc_in", id: "TI-1", customer: "A", due: "2026-11-01", daysLate: 8 }]);
    expect(o.topDebtors).toEqual([{ name: "Khách A", debt: 120000000, orders: 3 }]);
  });

  it("missing or bad values: zeros, empty lists", () => {
    const o = toOverview({ attention: null, months: "x" });
    expect(o.attention.overdue).toBe(0);
    expect(o.months).toEqual([]);
    expect(o.monthStart).toBe("");
  });
});

describe("delta", () => {
  it("colours by good / bad, not by direction", () => {
    expect(delta(120, 100, true)).toEqual({ pct: 20, dir: "up", tone: "good" });
    expect(delta(120, 100, false)).toEqual({ pct: 20, dir: "up", tone: "bad" });
    expect(delta(80, 100, false)).toEqual({ pct: -20, dir: "down", tone: "good" });
    expect(delta(5, 5, true).tone).toBe("neutral");
  });
  it("negative base: change over |prev|; zero base: no percentage", () => {
    expect(delta(-50, -100, true)).toEqual({ pct: 50, dir: "up", tone: "good" });
    expect(delta(10, 0, true).pct).toBeNull();
  });
});

describe("labels and links", () => {
  it("month label carries the year in January", () => {
    expect(monthLabel("2026-11")).toBe("T11");
    expect(monthLabel("2026-01")).toBe("T1/26");
  });
  it("links use the list spec params", () => {
    expect(ordersHref({ type: "all", due: "overdue" })).toBe("/admin/don-hang?type=all&due=overdue");
    expect(pipelineHref("none")).toBe("/admin/don-hang?step=none&delivered=0");
    expect(leadsHref({ status: "new", assignee: "none" })).toBe("/portal?status=new&assignee=none");
  });
  it("short VND keeps the minus sign", () => {
    expect(vndShort(-12_500_000)).toBe("-12,5 tr");
    expect(vndShort(1_234_567_890)).toBe("1,2 tỷ");
  });
});
