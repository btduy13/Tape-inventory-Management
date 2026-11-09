import { describe, expect, it } from "vitest";
import { parseListParams } from "@/features/portal-ui/lib/list-params";
import { exportAoa, exportHeaders } from "./excel-export";
import { parseImportSheet, templateAoa, toIsoDate, toNumberText } from "./excel-import";
import { axisLine, selectedDebt, statusBadges } from "./list-row";
import { ORDERS_SPEC, monthRange, toOrdersQuery } from "./list-spec";
import { exportHref } from "./paths";
import { listPerms } from "./perms";
import type { AdminOrderRow } from "./types";

const row = (over: Partial<AdminOrderRow> = {}): AdminOrderRow => ({
  type: "bang_keo_in", id: "BK-11-26-001", thoi_gian: "2026-11-07T10:20:00", ngay_du_kien: "2026-11-10", ten_hang: "Băng keo ABC",
  quy_cach: "48mm x 90m x 45mic", mau_sac: "Đỏ", ten_khach_hang: "Anh Nam", sdt_khach_hang: "0901", dia_chi_khach_hang: null,
  customer_id: null, so_luong: 100, don_gia_ban: 15000, thanh_tien_ban: 1500000, vat: 120000, tong_tien: 1620000, tien_coc: 0,
  cong_no_khach: 1620000, cong_no_ncc: 1000000, tien_von: 1000000, loi_nhuan_rong: 500000, ctv: null, da_giao: false,
  da_tat_toan: false, da_gui_email: false, is_quote: false, has_quote_items: false, loai_truc: "cu", ten_truc: null,
  truc_chu_vi: null, truc_so_luong: null, truc_thanh_tien_ban: null, truc_ctv: null, truc_hoa_hong: null,
  truc_tien_hoa_hong: null, truc_loi_nhuan_rong: null, job_id: null, step: null, workshop_user_id: null,
  workshop_user_name: null, lead_id: null, ...over,
});

const withAxis = row({
  loai_truc: "moi", ten_truc: "Trục logo", truc_chu_vi: 320, truc_so_luong: 2, truc_thanh_tien_ban: 400000,
  tong_tien: 1620000 + 432000, truc_ctv: "Lan", truc_hoa_hong: 10, truc_tien_hoa_hong: 20000, truc_loi_nhuan_rong: 180000,
  loi_nhuan_rong: 680000,
});

describe("listPerms", () => {
  it("admin has all; others only the ticked codes", () => {
    expect(Object.values(listPerms({ role: "admin", is_active: true, nav_tabs: null, permissions: [] })).every(Boolean)).toBe(true);
    expect(listPerms({ role: "staff", is_active: true, nav_tabs: null, permissions: ["orders.export", "orders.status"] })).toEqual({
      money: false, create: false, edit: false, status: true, delete: false, export: true,
    });
  });
});

describe("filters -> admin_orders_list", () => {
  const today = "2026-11-09";
  it("month = most recent occurrence; intersects from/to", () => {
    expect(monthRange(11, today)).toEqual({ from: "2026-11-01", to: "2026-11-30" });
    expect(monthRange(12, today)).toEqual({ from: "2025-12-01", to: "2025-12-31" });
    expect(monthRange(2, "2028-03-01")).toEqual({ from: "2028-02-01", to: "2028-02-29" });
    const q = toOrdersQuery(parseListParams(ORDERS_SPEC, { month: "11", from: "2026-11-05" }), { today });
    expect(q.filter).toMatchObject({ date_from: "2026-11-05", date_to: "2026-11-30" });
    expect(toOrdersQuery(parseListParams(ORDERS_SPEC, { month: "13" }), { today }).filter).not.toHaveProperty("date_from");
  });

  it("CTV only with orders.money, sanitized", () => {
    const state = parseListParams(ORDERS_SPEC, { ctv: "  Lan%_ " });
    expect(state.filters.ctv).toEqual(["Lan"]);
    expect(toOrdersQuery(state, { today, money: true }).filter.ctv).toBe("Lan");
    expect(toOrdersQuery(state, { today }).filter).not.toHaveProperty("ctv");
  });
});

describe("status column", () => {
  it("one badge: Đã giao, else workshop step / 'Chưa vào xưởng' (printed tape) or Chưa giao; email appended", () => {
    expect(statusBadges(row()).map((b) => [b.label, b.tone])).toEqual([["Chưa vào xưởng", "grey"]]);
    expect(statusBadges(row({ job_id: "j", step: "dang_san_xuat" })).map((b) => b.label)).toEqual(["Đang sản xuất"]);
    expect(statusBadges(row({ da_giao: true, da_gui_email: true, job_id: "j", step: "da_giao" })).map((b) => [b.label, b.tone]))
      .toEqual([["Đã giao · Đã email", "green"]]);
    expect(statusBadges(row({ type: "thank_you" })).map((b) => b.label)).toEqual(["Chưa giao"]);
    expect(statusBadges(row({ is_quote: true })).map((b) => b.label)).toEqual(["Báo giá"]);
  });
});

describe("axis child line + selection debt", () => {
  it("only for a new axis; cost side hidden without money", () => {
    expect(axisLine(row(), true)).toBeNull();
    expect(axisLine(withAxis, true)).toEqual({
      name: "Trục logo", meta: "Chu vi 320 • 2 trục", total: 400000, ctv: "Lan", commission: { pct: 10, amount: 20000 }, netProfit: 180000,
    });
    expect(axisLine({ ...withAxis, truc_chu_vi: null, ten_truc: null }, false)).toMatchObject({
      name: "Trục mới", meta: "2 trục", ctv: null, commission: null, netProfit: null,
    });
  });
  it("Tổng CN skips settled orders", () => {
    expect(selectedDebt([row(), row({ da_tat_toan: true, cong_no_khach: 999 }), row({ cong_no_khach: 5 })])).toBe(1620005);
  });
});

describe("Excel export", () => {
  const full = (over: Record<string, unknown> = {}) => ({
    ...row(), quy_cach_mm: 48, quy_cach_m: 90, quy_cach_mic: 45, cuon_cay: 5, phi_sl: 100, don_gia_goc: 10000, thanh_tien_goc: 1000000,
    vat_percent: 8, hoa_hong: 0, loi_nhuan: 500000, tien_ship: 0, ...over,
  });
  const axisRow = full({ loai_truc: "moi", ten_truc: "Trục logo", truc_chu_vi: 320, truc_so_luong: 2, truc_gia_goc: 100000,
    truc_gia_ban: 200000, truc_thanh_tien_goc: 200000, truc_thanh_tien_ban: 400000, truc_vat: 32000, truc_vat_percent: 8,
    truc_ctv: "Lan", truc_hoa_hong: 10, truc_tien_hoa_hong: 20000, truc_loi_nhuan: 200000, truc_loi_nhuan_rong: 180000 });

  it("app's per-type columns; cost columns only with money", () => {
    expect(exportHeaders("bang_keo_in", true)).toEqual(expect.arrayContaining(["Quy Cách (mm)", "Cuộn/Cây", "Phí SL", "Giá Vốn", "Hoa Hồng (%)", "Lõi Giấy", "VAT (%)"]));
    expect(exportHeaders("bang_keo_in", true)).not.toContain("Tên Trục");
    expect(exportHeaders("bang_keo", false)).not.toContain("Giá Gốc");
    expect(exportHeaders("bang_keo", false)).not.toContain("Nợ NCC");
    expect(exportHeaders("thank_you", true).filter((h) => h === "Ghi Chú")).toHaveLength(1);
  });

  it("order row, then one axis row from the row's trục columns", () => {
    const aoa = exportAoa([axisRow, full({ id: "BK-2", da_giao: true, da_tat_toan: true })], "bang_keo_in", true);
    const h = aoa[0] as string[];
    const at = (r: number, col: string) => aoa[r]![h.indexOf(col)];
    expect(aoa).toHaveLength(4);
    expect(at(1, "Ngày Tạo")).toBe("07/11/2026");
    expect(at(1, "Thành Tiền Gồm VAT")).toBe(1620000);
    expect(at(1, "VAT (%)")).toBe(8);
    expect(at(1, "Phí SL")).toBe(100);
    expect(at(2, "Mã Đơn Hàng")).toBe("↳ BK-11-26-001");
    expect(at(2, "Tên Hàng")).toBe("↳ Trục kèm BKI: Trục logo");
    expect(at(2, "VAT")).toBe(32000);
    expect(at(2, "Giá Bán")).toBe(200000);
    expect(at(2, "Lợi Nhuận Ròng")).toBe(180000);
    expect(at(2, "Ghi Chú")).toMatch(/^VAT 8% · Giá gồm VAT 432.000đ$/);
    expect([at(3, "Đã Giao"), at(3, "Đã Tất Toán")]).toEqual(["Rồi", "Xong"]);
  });

  it("axis rows from quote_items while their totals match the row", () => {
    const axis = (name: string, total: number) => ({ name, circumference: 300, quantity: 1, unitPrice: total, total, vat: 0, vatPercent: 0 });
    const q = full({ loai_truc: "moi", truc_thanh_tien_ban: 300, truc_vat: 0,
      quote_items: [{ total: 1500000, axes: [axis("A", 100), axis("B", 200)] }] });
    const aoa = exportAoa([q], "bang_keo_in", false);
    expect(aoa.map((r) => r[2])).toEqual(["Tên Hàng", "Băng keo ABC", "↳ Trục kèm BKI: A", "↳ Trục kèm BKI: B"]);
    expect(aoa[0]).not.toContain("CTV");
    const stale = exportAoa([{ ...q, truc_thanh_tien_ban: 999, ten_truc: "Gộp" }], "bang_keo_in", false);
    expect(stale.map((r) => r[2])).toEqual(["Tên Hàng", "Băng keo ABC", "↳ Trục kèm BKI: Gộp"]);
  });
});

describe("Excel import", () => {
  it("template: app headers + sample row with tomorrow's date", () => {
    const { data } = templateAoa("bang_keo", "2026-11-09");
    expect(data[0]).toEqual(["Tên hàng", "Tên khách hàng", "Ngày dự kiến", "Quy cách", "Số lượng", "Màu sắc", "Đơn giá gốc",
      "Đơn giá bán", "CTV", "Hoa hồng (%)", "Tiền ship", "Đã giao", "Đã tất toán", "VAT (%)"]);
    expect(data[1]![2]).toBe("10/11/2026");
  });

  it("values: Excel dates, thousands, booleans, axis type, accent-free headers", () => {
    expect(toIsoDate(46336)).toBe("2026-11-10"); // serial 25569 = 1970-01-01
    expect(toIsoDate("5/11/2026")).toBe("2026-11-05");
    expect(toNumberText("15.000")).toBe("15000");
    expect(toNumberText("1,5")).toBe("1.5");
    expect(toNumberText("0,500")).toBe("0.5");
    expect(toNumberText("1.200.000")).toBe("1200000");
    const { rows, detailLines } = parseImportSheet("bang_keo_in", [
      ["TEN HANG", "Tên khách hàng", "Ngày dự kiến", "Đơn giá bán", "Loại trục", "Đã giao", "Đã tất toán", "SĐT khách", "Lạ"],
      ["Băng keo", "Anh Nam", "10/11/2026", "15.000", "Trục mới", "Rồi", "", "0901", "bỏ qua"],
      ["", "", "", "", "", "", "", "", ""],
      ["↳ Trục kèm BKI: X", "", "", "", "Trục kèm BKI", "", "", "", ""],
    ]);
    expect(detailLines).toEqual([4]);
    expect(rows).toEqual([{
      line: 2, delivered: true, settled: false,
      fields: { ten_hang: "Băng keo", ten_khach_hang: "Anh Nam", ngay_du_kien: "2026-11-10", don_gia_ban: "15000", loai_truc: "moi", sdt_khach_hang: "0901" },
    }]);
  });
});

describe("export page link", () => {
  it("ids comma-joined, optional doc", () => {
    expect(exportHref(["BK-1"], "phieu_giao_hang")).toBe("/admin/don-hang/xuat?ids=BK-1&doc=phieu_giao_hang");
    expect(exportHref(["A", "B"])).toBe("/admin/don-hang/xuat?ids=A%2CB");
    expect(exportHref([])).toBe("/admin/don-hang/xuat");
  });
});
