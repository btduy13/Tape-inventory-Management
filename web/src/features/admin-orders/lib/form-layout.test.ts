import { describe, expect, it } from "vitest";
import { AXIS_FIELDS, BASIC_FIELDS, PRICE_FIELDS, priceGroups, visibleFields } from "./form-layout";
import { formCalc } from "./form-totals";
import { ORDER_SCHEMAS, WORKSHOP_KEYS } from "./schemas";
import { ORDER_TYPES } from "./types";

describe("form layout", () => {
  it("price groups keep every field once and drop empty groups", () => {
    for (const type of ORDER_TYPES) {
      const groups = priceGroups(PRICE_FIELDS[type]);
      expect(groups.flatMap(([, fields]) => fields.map(([k]) => k)).sort()).toEqual(PRICE_FIELDS[type].map(([k]) => k).sort());
      expect(groups.every(([, fields]) => fields.length > 0)).toBe(true);
    }
    expect(priceGroups(PRICE_FIELDS.bang_keo).map(([g]) => g)).toEqual(["price", "pay", "profit"]);
  });

  it("draws every editable field of the zod schema (the update action keeps fields it does not get)", () => {
    const drawn = new Set(["ten_hang", "ngay_du_kien", "ten_khach_hang", "sdt_khach_hang", "dia_chi_khach_hang", "customer_id", "loai_truc"]);
    for (const type of ORDER_TYPES) {
      const keys = new Set([...drawn, ...[...BASIC_FIELDS[type], ...PRICE_FIELDS[type], ...(type === "bang_keo_in" ? AXIS_FIELDS : [])].map(([k]) => k)]);
      const missing = Object.keys(ORDER_SCHEMAS[type].shape).filter((k) => !keys.has(k) && !(WORKSHOP_KEYS as readonly string[]).includes(k));
      expect(missing, type).toEqual([]);
    }
  });

  it("without orders.money hides computed costs, CTV and profit but keeps the cost inputs", () => {
    const bk = visibleFields(PRICE_FIELDS.bang_keo, false).map(([k]) => k);
    expect(bk).toContain("don_gia_goc");
    expect(bk).not.toContain("loi_nhuan_rong");
    expect(bk).not.toContain("ctv");
    const bki = visibleFields(PRICE_FIELDS.bang_keo_in, false).map(([k]) => k);
    expect(bki).not.toContain("don_gia_goc");
    expect(bki).toContain("phi_sl");
    expect(bki).toContain("don_gia_von");
    expect(bki).not.toContain("thanh_tien_goc");
    expect(bki).toContain("cong_no_khach");
    expect(visibleFields(AXIS_FIELDS, false).map(([k]) => k)).toContain("truc_gia_goc");
  });
});

describe("formCalc", () => {
  it("inline read-only fields per column, product and axis kept apart", () => {
    const v = {
      so_luong: "120", quy_cach_m: "90", cuon_cay: "60", don_gia_von: "900000", don_gia_ban: "26000", hoa_hong: "5",
      tien_ship: "100000", loai_truc: "moi", truc_so_luong: "1", truc_gia_goc: "1200000", truc_gia_ban: "1800000", truc_hoa_hong: "10",
    };
    expect(formCalc("bang_keo_in", v)).toMatchObject({
      don_gia_goc: 15000, thanh_tien_goc: 1800000, thanh_tien_ban: 3120000, tien_hoa_hong: 66000, loi_nhuan: 1320000,
      loi_nhuan_rong: 1154000, truc_thanh_tien_ban: 1800000, truc_loi_nhuan: 600000, truc_tien_hoa_hong: 60000, truc_loi_nhuan_rong: 540000,
    });
    expect(formCalc("bang_keo", { so_luong: "10", don_gia_goc: "1500", don_gia_ban: "2500" })).toMatchObject({ thanh_tien: 15000, thanh_tien_ban: 25000, loi_nhuan_rong: 10000 });
  });
});
