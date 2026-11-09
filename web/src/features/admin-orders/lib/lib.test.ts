import { describe, expect, it } from "vitest";
import { formatVnd } from "@/i18n";
import { parseListParams } from "@/features/portal-ui/lib/list-params";
import { dateTimeVn, dateVn, money, normalizeVnPhone, originOf, toNumber, vndShort } from "./format";
import { formTotals, orderTotals } from "./form-totals";
import { ORDERS_SPEC, dueTone, toOrdersQuery } from "./list-spec";
import { newOrderHref, orderEditHref, orderHref, tabHref } from "./paths";

describe("toOrdersQuery", () => {
  it("maps whitelisted URL params to admin_orders_list (printed tape by default)", () => {
    const state = parseListParams(ORDERS_SPEC, {
      q: "Nam", step: "dang_san_xuat", delivered: "0", settled: "1", due: "overdue", from: "2026-11-01", to: "2026-11-30",
      sort: "tong_tien", dir: "asc", page: "3", size: "50",
    });
    expect(toOrdersQuery(state)).toEqual({
      type: "bang_keo_in",
      filter: {
        q: "Nam", step: "dang_san_xuat", delivered: false, settled: true, due: "overdue",
        date_from: "2026-11-01", date_to: "2026-11-30", sort: "tong_tien", dir: "asc", limit: 50, offset: 100,
      },
    });
  });

  it("drops unknown values; keeps 'none'; default sort is newest first", () => {
    const state = parseListParams(ORDERS_SPEC, { step: "bogus", delivered: "yes", from: "2026-13-01", sort: "evil", type: "x" });
    expect(toOrdersQuery(state)).toEqual({ type: "bang_keo_in", filter: { sort: "thoi_gian", dir: "desc", limit: 25, offset: 0 } });
    expect(toOrdersQuery(parseListParams(ORDERS_SPEC, { step: "none" })).filter).toMatchObject({ step: "none" });
  });

  it("other types drop the workshop step; the quote tab lists every type's quotes without status filters", () => {
    expect(toOrdersQuery(parseListParams(ORDERS_SPEC, { type: "thank_you", step: "none", settled: "0" }))).toMatchObject({
      type: "thank_you", filter: { settled: false },
    });
    expect(toOrdersQuery(parseListParams(ORDERS_SPEC, { type: "thank_you", step: "none" })).filter).not.toHaveProperty("step");
    const quotes = toOrdersQuery(parseListParams(ORDERS_SPEC, { type: "quote", delivered: "1", due: "soon", q: "A" }));
    expect(quotes).toEqual({ type: "all", filter: { q: "A", is_quote: true, sort: "thoi_gian", dir: "desc", limit: 25, offset: 0 } });
  });

  it("the all tab (overview KPIs) lists real orders of every type with status filters, no workshop step", () => {
    const all = toOrdersQuery(parseListParams(ORDERS_SPEC, { type: "all", due: "overdue", step: "none" }));
    expect(all).toEqual({ type: "all", filter: { due: "overdue", sort: "thoi_gian", dir: "desc", limit: 25, offset: 0 } });
  });
});

describe("dueTone (same rule as admin_orders_list)", () => {
  const today = "2026-11-07";
  it("overdue before today, soon within 3 days, never for delivered orders or quotes", () => {
    expect(dueTone("2026-11-06", false, false, today)).toBe("overdue");
    expect(dueTone("2026-11-07", false, false, today)).toBe("soon");
    expect(dueTone("2026-11-10", false, false, today)).toBe("soon");
    expect(dueTone("2026-11-11", false, false, today)).toBeNull();
    expect(dueTone("2026-11-01", true, false, today)).toBeNull();
    expect(dueTone("2026-11-01", false, true, today)).toBeNull();
    expect(dueTone(null, false, false, today)).toBeNull();
  });
});

describe("format helpers", () => {
  it("formats money through formatVnd, dates and numeric strings", () => {
    expect(money(1234567)).toBe(formatVnd(1234567));
    expect(money("99.6")).toBe(formatVnd(100));
    expect(money(null)).toBe("—");
    expect(toNumber("x")).toBeNull();
    expect(dateVn("2026-11-03")).toBe("03/11/2026");
    expect(dateTimeVn("2026-11-03T09:05:00")).toBe("09:05 03/11/2026");
    expect(dateVn(null)).toBe("—");
    expect(vndShort(1_234_567_890)).toBe("1,2 tỷ");
    expect(vndShort(25_400_000)).toBe("25,4 tr");
    expect(vndShort(950_000)).toBe(formatVnd(950_000));
  });

  it("derives the origin from lead id and the trigger's first note", () => {
    expect(originOf("lead-1", "Đơn mới từ web: BK-1")).toBe("lead");
    expect(originOf(null, "Đơn mới từ web: BK-11-26-001")).toBe("web");
    expect(originOf(null, "Đơn mới từ app: BK-11-26-002")).toBe("app");
    expect(originOf(null, null)).toBe("app");
  });

  it("builds the order links (printed tape keeps the old URLs)", () => {
    expect(orderHref("bang_keo_in", "BK-11-26-001")).toBe("/admin/don-hang/BK-11-26-001");
    expect(orderHref("thank_you", "TY-11-26-001")).toBe("/admin/don-hang/TY-11-26-001?type=thank_you");
    expect(orderEditHref("bang_keo", "B-1")).toBe("/admin/don-hang/B-1/sua?type=bang_keo");
    expect(newOrderHref("bang_keo_in")).toBe("/admin/don-hang/moi");
    expect(newOrderHref("truc_in", true)).toBe("/admin/don-hang/moi?type=truc_in&quote=1");
    expect(tabHref("quote")).toBe("/admin/don-hang?type=quote");
  });
});

describe("formTotals / orderTotals", () => {
  it("maps printed-tape form fields like the desktop form, VAT as a percent", () => {
    const v = {
      so_luong: "120", quy_cach_m: "90", cuon_cay: "60", don_gia_von: "900000", don_gia_ban: "26000",
      hoa_hong: "5", tien_ship: "100000", tien_coc: "1000000", vat_percent: "8", loai_truc: "moi",
      truc_so_luong: "1", truc_gia_goc: "1200000", truc_gia_ban: "1800000", truc_hoa_hong: "10", truc_vat_percent: "",
    };
    const r = formTotals(v);
    expect(r.product.costPrice).toBe(15000);
    expect(r.vat).toBe(249600);
    expect(r.axis.saleTotal).toBe(1800000);
    expect(r.axis.vat).toBe(0);
    expect(r.combinedNetProfit).toBe(1694000);
    expect(r.outstanding).toBe(3120000 + 249600 + 1800000 - 1000000);
    const s = orderTotals("bang_keo_in", v);
    expect(s).toMatchObject({ payable: 3120000 + 249600 + 1800000, deposit: 1000000, outstanding: r.outstanding, netProfit: 1694000, axisSaleTotal: 1800000 });
  });

  it("ignores axis fields for an old axis and ignores a stale VAT amount", () => {
    const r = formTotals({ so_luong: "2", quy_cach_m: "90", cuon_cay: "1", don_gia_ban: "100000", loai_truc: "cu", truc_gia_ban: "5", vat: "999" });
    expect(r.axis.saleTotal).toBe(0);
    expect(r.vat).toBe(0);
    expect(r.outstanding).toBe(200000);
    expect(orderTotals("bang_keo_in", { loai_truc: "cu" }).axisSaleTotal).toBeNull();
  });

  it("plain tape / axis: cost from don_gia_goc, no deposit (order_compute)", () => {
    const v = { so_luong: "10", don_gia_goc: "1500", don_gia_ban: "2500", vat_percent: "10", hoa_hong: "20", tien_ship: "1000", tien_coc: "999999" };
    for (const type of ["bang_keo", "truc_in"] as const) {
      expect(orderTotals(type, v)).toMatchObject({
        costTotal: 15000, saleTotal: 25000, vat: 2500, payable: 27500, deposit: null, outstanding: 27500,
        profit: 10000, commission: 2000, netProfit: 7000,
      });
    }
  });

  it("Thank you: cost from don_gia_von, deposit lowers the debt, never below 0", () => {
    const v = { so_luong: "100", don_gia_von: "3000", don_gia_ban: "5000", vat_percent: "8", tien_coc: "200000" };
    expect(orderTotals("thank_you", v)).toMatchObject({ costTotal: 300000, saleTotal: 500000, vat: 40000, deposit: 200000, outstanding: 340000, netProfit: 200000 });
    expect(orderTotals("thank_you", { ...v, tien_coc: "9000000" }).outstanding).toBe(0);
  });
});

describe("normalizeVnPhone (= SQL normalize_vn_phone)", () => {
  it("normalizes +84 / 0084 / 84 / 9 digits and rejects the rest", () => {
    expect(normalizeVnPhone("+84 912.345.678")).toBe("0912345678");
    expect(normalizeVnPhone("0084912345678")).toBe("0912345678");
    expect(normalizeVnPhone("912345678")).toBe("0912345678");
    expect(normalizeVnPhone("0912 345 678")).toBe("0912345678");
    expect(normalizeVnPhone("02838123456")).toBe("02838123456");
    expect(normalizeVnPhone("12345")).toBeNull();
    expect(normalizeVnPhone("0912345678 / 0987654321")).toBeNull();
    expect(normalizeVnPhone(null)).toBeNull();
  });
});
