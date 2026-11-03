import { describe, expect, it } from "vitest";
import { parseListParams } from "@/features/portal-ui/lib/list-params";
import { dateTimeVn, dateVn, money, originOf, toNumber } from "./format";
import { formTotals } from "./form-totals";
import { ORDERS_SPEC, toOrdersFilter } from "./list-spec";

describe("toOrdersFilter", () => {
  it("maps whitelisted URL params to admin_orders_list keys", () => {
    const state = parseListParams(ORDERS_SPEC, {
      q: "Nam", step: "dang_san_xuat", delivered: "0", settled: "1", from: "2026-11-01", to: "2026-11-30", page: "3", size: "50",
    });
    expect(toOrdersFilter(state)).toEqual({
      q: "Nam", step: "dang_san_xuat", delivered: false, settled: true,
      date_from: "2026-11-01", date_to: "2026-11-30", limit: 50, offset: 100,
    });
  });

  it("drops unknown steps, bad booleans and dates; keeps 'none'", () => {
    const state = parseListParams(ORDERS_SPEC, { step: "dang_in", delivered: "yes", from: "2026-13-01", evil: "1" });
    expect(toOrdersFilter(state)).toEqual({ limit: 25, offset: 0 });
    expect(toOrdersFilter(parseListParams(ORDERS_SPEC, { step: "none" }))).toMatchObject({ step: "none" });
  });
});

describe("format helpers", () => {
  it("formats money, dates and numeric strings", () => {
    expect(money(1234567)).toBe("1.234.567 đ");
    expect(money("99.6")).toBe("100 đ");
    expect(money(null)).toBe("—");
    expect(toNumber("x")).toBeNull();
    expect(dateVn("2026-11-03")).toBe("03/11/2026");
    expect(dateTimeVn("2026-11-03T09:05:00")).toBe("09:05 03/11/2026");
    expect(dateVn(null)).toBe("—");
  });

  it("derives the origin from lead id and the trigger's first note", () => {
    expect(originOf("lead-1", "Đơn mới từ web: BK-1")).toBe("lead");
    expect(originOf(null, "Đơn mới từ web: BK-11-26-001")).toBe("web");
    expect(originOf(null, "Đơn mới từ app: BK-11-26-002")).toBe("app");
    expect(originOf(null, null)).toBe("app");
  });
});

describe("formTotals", () => {
  it("maps form fields like the desktop form, VAT as a percent", () => {
    const r = formTotals({
      so_luong: "120", quy_cach_m: "90", cuon_cay: "60", don_gia_von: "900000", don_gia_ban: "26000",
      hoa_hong: "5", tien_ship: "100000", tien_coc: "1000000", vat_percent: "8", loai_truc: "moi",
      truc_so_luong: "1", truc_gia_goc: "1200000", truc_gia_ban: "1800000", truc_hoa_hong: "10", truc_vat_percent: "",
    });
    expect(r.product.costPrice).toBe(15000);
    expect(r.vat).toBe(249600);
    expect(r.axis.saleTotal).toBe(1800000);
    expect(r.axis.vat).toBe(0);
    expect(r.combinedNetProfit).toBe(1694000);
    expect(r.outstanding).toBe(3120000 + 249600 + 1800000 - 1000000);
  });

  it("ignores axis fields for an old axis and ignores a stale VAT amount", () => {
    const r = formTotals({ so_luong: "2", quy_cach_m: "90", cuon_cay: "1", don_gia_ban: "100000", loai_truc: "cu", truc_gia_ban: "5", vat: "999" });
    expect(r.axis.saleTotal).toBe(0);
    expect(r.vat).toBe(0);
    expect(r.outstanding).toBe(200000);
  });
});
