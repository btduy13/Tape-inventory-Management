import { describe, expect, it } from "vitest";
import { orderEmailDraft, emailSubject, splitRecipients } from "./email-template";
import { parsePickerFilter } from "./picker";
import { buildExportLines, calculateVoucherTotals, draftOf, editLineNumber, specsAndUnit, type ExportOrder } from "./voucher";

const base: ExportOrder = {
  type: "bang_keo_in", id: "BK-11-26-001", ten_hang: "Băng keo ABC", ten_khach_hang: "Khách A", dia_chi_khach_hang: "Q1",
  quy_cach: null, quy_cach_mm: 48.7, quy_cach_m: 100, quy_cach_mic: 50, mau_sac: "Đỏ", mau_keo: "Trong",
  so_luong: 100, don_gia_ban: 1000, thanh_tien_ban: 100000, vat_percent: 8, vat: 8000, tien_coc: 20000,
  quote_items: null, loai_truc: "cu", ten_truc: null, truc_chu_vi: null, truc_so_luong: null, truc_gia_ban: null,
  truc_thanh_tien_ban: null, truc_vat_percent: null, truc_vat: null,
};

describe("specsAndUnit", () => {
  it("formats each type like the app", () => {
    expect(specsAndUnit(base)).toEqual({ specs: "48mm x 100m x 50mic", unit: "cuộn" });
    expect(specsAndUnit({ ...base, type: "truc_in", quy_cach: "300" }).specs).toBe("300mm");
    expect(specsAndUnit({ ...base, type: "truc_in", quy_cach: "300MM" }).specs).toBe("300MM");
    expect(specsAndUnit({ ...base, type: "thank_you", quy_cach: "5x5cm" })).toEqual({ specs: "5x5cm", unit: "cuộn" });
    expect(specsAndUnit({ ...base, type: "bang_keo", quy_cach: "12,5" })).toEqual({ specs: "12,5kg", unit: "KG" });
    expect(specsAndUnit({ ...base, type: "bang_keo", quy_cach: "48mm x 100y" }).specs).toBe("48mm x 100y");
  });
});

describe("buildExportLines", () => {
  it("one sale line from the row, axis 'cu' adds nothing", () => {
    const lines = buildExportLines(base);
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({ id: base.id, product: "Băng keo ABC", text_color: "Đỏ", bg_color: "Trong", quantity: 100, price: 1000, total: 100000, vat: 8000, vatPercent: 8 });
  });

  it("new axis adds a '-TRUC' line", () => {
    const o = { ...base, loai_truc: "moi", ten_truc: null, truc_chu_vi: 300, truc_so_luong: 2, truc_gia_ban: 50000, truc_thanh_tien_ban: 100000, truc_vat: 10000, truc_vat_percent: 10 };
    const [, axis] = buildExportLines(o);
    expect(axis).toEqual({ id: `${base.id}-TRUC`, product: "Trục mới", specs: "Chu vi 300", text_color: "", bg_color: "Trục mới", unit: "trục", quantity: 2, price: 50000, vat: 10000, vatPercent: 10, total: 100000 });
  });

  it("matching quote_items: one line per size and per axis", () => {
    const items = [
      { specification: "48mm x 100m", quantity: 50, unitPrice: 1000, total: 50000, vat: 4000, vatPercent: 8, details: { printColor: "Xanh", glueColor: "Đục" },
        axes: [{ name: "Trục A", circumference: 280, quantity: 1, unitPrice: 60000, total: 60000, vat: 6000, vatPercent: 10 }] },
      { specification: "-", quantity: 50, unitPrice: 1000, total: 50000, vat: 4000 },
    ];
    const o = { ...base, quote_items: JSON.stringify(items), loai_truc: "moi", truc_thanh_tien_ban: 60000, truc_vat: 6000 };
    const lines = buildExportLines(o);
    expect(lines.map((l) => l.id)).toEqual([`${base.id}-1`, `${base.id}-1-TRUC-1`, `${base.id}-2`]);
    expect(lines[0]).toMatchObject({ specs: "48mm x 100m", text_color: "Xanh", bg_color: "Đục", total: 50000 });
    expect(lines[1]).toMatchObject({ product: "Trục A", specs: "Chu vi 280", unit: "trục", total: 60000, vat: 6000 });
    expect(lines[2]).toMatchObject({ specs: "48mm x 100m x 50mic", text_color: "Đỏ", vatPercent: 8 });
  });

  it("stale quote_items (totals differ) fall back to the row", () => {
    const items = [{ specification: "x", quantity: 1, unitPrice: 1, total: 1 }];
    expect(buildExportLines({ ...base, quote_items: items }).map((l) => l.id)).toEqual([base.id]);
  });

  it("missing total = quantity x price; VAT % derived when not stored", () => {
    const [l] = buildExportLines({ ...base, thanh_tien_ban: 0, vat_percent: null, vat: 5000 });
    expect(l.total).toBe(100000);
    expect(l.vatPercent).toBe(5);
  });
});

describe("totals and edits", () => {
  it("draft takes the first customer and sums deposits", () => {
    const d = draftOf([base, { ...base, id: "B-1", type: "bang_keo", ten_khach_hang: "Khác", tien_coc: 5000.4 }]);
    expect(d).toMatchObject({ customer: "Khách A", address: "Q1", deposit: 25000 });
    expect(d.lines).toHaveLength(2);
  });

  it("calculateVoucherTotals rounds, ignores negatives, clamps remaining", () => {
    expect(calculateVoucherTotals([{ total: 100000, vat: 8000.4 }, { total: -5, vat: 0 }], 200000))
      .toEqual({ subtotal: 100000, vat: 8000, deposit: 200000, totalPayable: 108000, remaining: 0 });
  });

  it("editing quantity keeps the VAT %, editing VAT sets a new %", () => {
    const [l] = buildExportLines(base);
    expect(editLineNumber(l, "quantity", "200")).toMatchObject({ quantity: 200, total: 200000, vat: 16000, vatPercent: 8 });
    expect(editLineNumber(l, "vat", "10000")).toMatchObject({ vat: 10000, vatPercent: 10, total: 100000 });
    expect(editLineNumber(l, "price", "-1")).toBeNull();
    expect(editLineNumber(l, "price", "")).toBeNull();
  });
});

describe("email template", () => {
  it("builds the app's subject and body", () => {
    const d = orderEmailDraft("bang_keo_in", { ten_hang: "ABC\nX", loai_truc: "moi", so_luong: 1200, quy_cach_mm: 48, quy_cach_m: 100, quy_cach_mic: 50 });
    expect(d.baseSubject).toBe("Băng Keo In ABC X");
    expect(d.isNewAxis).toBe(true);
    expect(emailSubject(d.baseSubject, false)).toBe("TRỤC CŨ - Băng Keo In ABC X");
    expect(d.body).toContain("Số lượng: 1.200 cuộn");
    expect(d.body).toContain("Quy cách: 48mm * 100m * 50mic\nLõi giấy: Mặc định\nThùng bao: Mặc định");
    expect(d.body).toContain("Màu keo: Thường");
    expect(orderEmailDraft("bang_keo", { quy_cach: "12", so_luong: 3 }).body).toContain("Quy cách: 12 KG");
    expect(orderEmailDraft("thank_you", { kich_thuoc: "5x5", ghi_chu: "gấp" }).body).toContain("Kích thước: 5x5\nGhi chú: gấp");
  });

  it("splits recipients", () => {
    expect(splitRecipients(" A@x.vn; b@y.vn,a@x.vn ,")).toEqual(["a@x.vn", "b@y.vn"]);
  });
});

describe("parsePickerFilter", () => {
  const now = new Date(2026, 10, 9);
  it("defaults and bounds", () => {
    expect(parsePickerFilter({}, now)).toEqual({ year: 2026, month: null, type: "all", q: "" });
    expect(parsePickerFilter({ year: "2019", month: "13", loai: "x" }, now)).toMatchObject({ year: 2026, month: null, type: "all" });
    expect(parsePickerFilter({ year: "2021", month: "2", loai: "truc_in", q: " ab " }, now)).toEqual({ year: 2021, month: 2, type: "truc_in", q: "ab" });
  });
});
