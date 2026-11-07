import { describe, expect, it } from "vitest";
import {
  ORDER_SCHEMAS, frozenOrderSchema, groupByType, orderFormSchema, orderIdSchema, orderItemsSchema, parseOrderType, statusSchema, toOrderPayload,
} from "./schemas";

const base = {
  ten_hang: " Băng keo in Vĩnh Thịnh ", ten_khach_hang: "Anh Nam", sdt_khach_hang: "0901 234 567",
  dia_chi_khach_hang: "", ngay_du_kien: "2026-11-10", quy_cach_mm: "48", quy_cach_m: "90",
  quy_cach_mic: "", cuon_cay: "60", so_luong: "120", don_gia_von: "900000", don_gia_ban: "26000",
  vat_percent: "8", hoa_hong: "", loai_truc: "cu", workshop_user_id: "",
};

describe("orderFormSchema + toOrderPayload", () => {
  it("trims text, turns numbers into JSON numbers and drops empty fields", () => {
    const parsed = orderFormSchema.parse(base);
    expect(toOrderPayload(parsed)).toEqual({
      ten_hang: "Băng keo in Vĩnh Thịnh", ten_khach_hang: "Anh Nam", sdt_khach_hang: "0901 234 567",
      ngay_du_kien: "2026-11-10", quy_cach_mm: 48, quy_cach_m: 90, cuon_cay: 60, so_luong: 120,
      don_gia_von: 900000, don_gia_ban: 26000, vat_percent: 8, loai_truc: "cu",
    });
  });

  it("accepts a decimal comma", () => {
    expect(orderFormSchema.parse({ ...base, don_gia_ban: "1234,5" }).don_gia_ban).toBe(1234.5);
  });

  it.each(["so_luong", "don_gia_ban", "quy_cach_m", "cuon_cay"])("requires %s > 0", (key) => {
    expect(orderFormSchema.safeParse({ ...base, [key]: "0" }).success).toBe(false);
    expect(orderFormSchema.safeParse({ ...base, [key]: "" }).success).toBe(false);
  });

  it("rejects missing names, bad dates, negatives, percents over 100 and bad uuids", () => {
    expect(orderFormSchema.safeParse({ ...base, ten_hang: "  " }).success).toBe(false);
    expect(orderFormSchema.safeParse({ ...base, ten_khach_hang: "" }).success).toBe(false);
    expect(orderFormSchema.safeParse({ ...base, ngay_du_kien: "10/11/2026" }).success).toBe(false);
    expect(orderFormSchema.safeParse({ ...base, phi_keo: "-1" }).success).toBe(false);
    expect(orderFormSchema.safeParse({ ...base, vat_percent: "101" }).success).toBe(false);
    expect(orderFormSchema.safeParse({ ...base, so_luong: "abc" }).success).toBe(false);
    expect(orderFormSchema.safeParse({ ...base, workshop_user_id: "x" }).success).toBe(false);
    expect(orderFormSchema.safeParse({ ...base, sdt_khach_hang: "1".repeat(31) }).success).toBe(false);
  });

  it("a new axis needs name, quantity, cost and price; an old axis sends no axis fields", () => {
    const axis = { loai_truc: "moi", ten_truc: "Trục 1", truc_so_luong: "1", truc_gia_goc: "1200000", truc_gia_ban: "1800000", truc_vat_percent: "8" };
    expect(orderFormSchema.safeParse({ ...base, ...axis, truc_gia_goc: "" }).success).toBe(false);
    expect(orderFormSchema.safeParse({ ...base, ...axis, ten_truc: "" }).success).toBe(false);
    const withAxis = toOrderPayload(orderFormSchema.parse({ ...base, ...axis }));
    expect(withAxis).toMatchObject({ loai_truc: "moi", ten_truc: "Trục 1", truc_so_luong: 1, truc_gia_ban: 1800000, truc_vat_percent: 8 });
    const old = toOrderPayload(orderFormSchema.parse({ ...base, ...axis, loai_truc: "cu" }));
    expect(Object.keys(old).some((k) => k.startsWith("truc_") || k === "ten_truc")).toBe(false);
  });

  it("validates order ids for the detail route", () => {
    expect(orderIdSchema.safeParse("BKI-11-26-001").success).toBe(true);
    expect(orderIdSchema.safeParse("a/b").success).toBe(false);
    expect(orderIdSchema.safeParse("").success).toBe(false);
  });
});

describe("other order types", () => {
  const head = { ten_hang: "Băng keo trong", ten_khach_hang: "Chị Lan", ngay_du_kien: "2026-11-10", so_luong: "50", don_gia_ban: "12000" };

  it("plain tape and axis require don_gia_goc > 0 (as in the app) and keep their own fields", () => {
    expect(ORDER_SCHEMAS.bang_keo.safeParse(head).success).toBe(false);
    const plain = toOrderPayload(ORDER_SCHEMAS.bang_keo.parse({ ...head, don_gia_goc: "9000", quy_cach: " 1.2kg ", mau_sac: "" }));
    expect(plain).toEqual({ ...head, so_luong: 50, don_gia_ban: 12000, don_gia_goc: 9000, quy_cach: "1.2kg" });
    expect(ORDER_SCHEMAS.truc_in.parse({ ...head, don_gia_goc: "1", mau_keo: "Vàng" }).mau_keo).toBe("Vàng");
    expect("tien_coc" in ORDER_SCHEMAS.bang_keo.shape).toBe(false);
  });

  it("Thank you: size, colour, cost, deposit and note; cost is optional", () => {
    const ty = toOrderPayload(ORDER_SCHEMAS.thank_you.parse({ ...head, kich_thuoc: "48mm x 100m", tien_coc: "50000", ghi_chu: "Giao sáng" }));
    expect(ty).toEqual({ ...head, so_luong: 50, don_gia_ban: 12000, kich_thuoc: "48mm x 100m", tien_coc: 50000, ghi_chu: "Giao sáng" });
    expect(ORDER_SCHEMAS.thank_you.safeParse({ ...head, ghi_chu: "x".repeat(2001) }).success).toBe(false);
  });

  it("update payload sends cleared fields as null and never the workshop fields", () => {
    const parsed = ORDER_SCHEMAS.thank_you.parse({ ...head, mau_sac: "", customer_id: "", ghi_chu: "" });
    expect(toOrderPayload(parsed, true)).toMatchObject({ mau_sac: null, customer_id: null, ghi_chu: null, so_luong: 50 });
    const bki = orderFormSchema.parse({ ...base, workshop_user_id: "", production_note: "x" });
    expect(Object.keys(toOrderPayload(bki, true))).not.toContain("production_note");
  });

  it("a multi-size quote order only edits name, customer and due date", () => {
    const f = frozenOrderSchema.parse({ ...head, don_gia_ban: "1" });
    expect(Object.keys(f).sort()).toEqual(["ngay_du_kien", "ten_hang", "ten_khach_hang"]);
  });
});

describe("action inputs", () => {
  it("parses the ?type= of the detail route, defaulting to printed tape", () => {
    expect(parseOrderType("thank_you")).toBe("thank_you");
    expect(parseOrderType(["truc_in"])).toBe("truc_in");
    expect(parseOrderType("orders; drop")).toBe("bang_keo_in");
    expect(parseOrderType(undefined)).toBe("bang_keo_in");
  });

  it("bulk selections: known types, valid ids, 1-500 items; grouped by type", () => {
    const items = [{ type: "bang_keo", id: "B-1" }, { type: "thank_you", id: "TY-1" }, { type: "bang_keo", id: "B-2" }];
    expect(orderItemsSchema.safeParse(items).success).toBe(true);
    expect(orderItemsSchema.safeParse([]).success).toBe(false);
    expect(orderItemsSchema.safeParse([{ type: "x", id: "B-1" }]).success).toBe(false);
    expect(orderItemsSchema.safeParse([{ type: "bang_keo", id: "a b" }]).success).toBe(false);
    expect(orderItemsSchema.safeParse(Array.from({ length: 501 }, (_, i) => ({ type: "bang_keo", id: `B-${i}` }))).success).toBe(false);
    expect([...groupByType(orderItemsSchema.parse(items))]).toEqual([["bang_keo", ["B-1", "B-2"]], ["thank_you", ["TY-1"]]]);
  });

  it("status needs at least one flag", () => {
    expect(statusSchema.safeParse({ da_giao: null, da_tat_toan: null }).success).toBe(false);
    expect(statusSchema.safeParse({ da_giao: true, da_tat_toan: null }).success).toBe(true);
  });
});
