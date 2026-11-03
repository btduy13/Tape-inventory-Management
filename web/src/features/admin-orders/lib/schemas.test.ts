import { describe, expect, it } from "vitest";
import { orderFormSchema, orderIdSchema, toOrderPayload } from "./schemas";

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
