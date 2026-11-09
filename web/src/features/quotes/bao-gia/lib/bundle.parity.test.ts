// Quote totals must match the desktop app: items built like quotations.js buildQuoteItem /
// axisFromFields with the JS orderMath, bundle = orderMath.calculateQuoteBundle. Skipped when electron/ is not checked out next to web/.
// @vitest-environment node
import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { buildItem, quoteBundle, quoteError, type Fields, type QuoteType, type SizeDraft } from "./bundle";
import { toQuotePayload } from "./schema";
import { draftsFromQuote, grandTotal, listPriceSummary, monthRange, normalizeItems, parseCurrency } from "./stored";

const jsPath = path.resolve(process.cwd(), "../electron/js/orderMath.js");
const present = existsSync(jsPath);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Js = Record<string, (...args: any[]) => any>;

function random(seed: number) {
  let s = seed;
  return (max: number, dp = 0) => {
    s = (s * 1103515245 + 12345) % 2147483648;
    const v = (s / 2147483648) * max;
    return String(dp ? Math.round(v * 10 ** dp) / 10 ** dp : Math.round(v));
  };
}

function sizes(type: QuoteType, seed: number): SizeDraft[] {
  const rnd = random(seed);
  return Array.from({ length: 1 + (seed % 4) }, (_, i) => {
    const fields: Fields = type === "bang_keo_in"
      ? {
          quy_cach_mm: "48", quy_cach_m: rnd(300), quy_cach_mic: "45", cuon_cay: String(1 + Number(rnd(100))),
          so_luong: rnd(5000), don_gia_von: rnd(2_000_000), phi_sl: rnd(50_000), phi_keo: rnd(50_000), phi_mau: rnd(80_000),
          phi_size: rnd(20_000), phi_cat: rnd(20_000), don_gia_ban: rnd(60_000, 1), hoa_hong: rnd(30, 1),
          tien_ship: rnd(300_000), tien_coc: rnd(3_000_000), vat_percent: rnd(10),
        }
      : { quy_cach: `QC ${i}`, so_luong: rnd(5000, 2), don_gia_goc: rnd(500_000, 1), don_gia_ban: rnd(800_000, 1), hoa_hong: rnd(20), tien_ship: rnd(100_000), vat_percent: rnd(10) };
    const axes = type === "bang_keo_in"
      ? Array.from({ length: (seed + i) % 3 }, (_, j) => ({
          ten_truc: `Trục ${j}`, truc_chu_vi: rnd(400), truc_so_luong: String(1 + Number(rnd(5))), truc_gia_goc: rnd(2_000_000),
          truc_gia_ban: rnd(3_000_000), truc_vat_percent: rnd(10), truc_ctv: "", truc_hoa_hong: rnd(20),
        }))
      : [];
    return { fields, axes };
  });
}

/** quotations.js buildQuoteItem with the desktop math (form values are plain numbers here). */
function jsItem(js: Js, type: QuoteType, s: SizeDraft) {
  const f = s.fields;
  const axes = s.axes.map((a) => {
    const r = js.calculateLine({ quantity: Number(a.truc_so_luong), costPrice: Number(a.truc_gia_goc), salePrice: Number(a.truc_gia_ban), commissionPercent: a.truc_hoa_hong });
    return {
      name: a.ten_truc, circumference: js.number(a.truc_chu_vi) || null, quantity: Number(a.truc_so_luong), costPrice: Number(a.truc_gia_goc),
      unitPrice: Number(a.truc_gia_ban), costTotal: r.costTotal, total: r.saleTotal, vat: js.vatAmount(r.saleTotal, a.truc_vat_percent),
      vatPercent: js.percent(a.truc_vat_percent), collaborator: "", commissionPercent: r.commissionPercent,
      commission: r.commission, profit: r.profit, netProfit: r.netProfit,
    };
  });
  if (type === "bang_keo_in") {
    const r = js.calculatePrintedTape({
      quantity: f.so_luong, baseCost: Number(f.don_gia_von), quantityFee: Number(f.phi_sl), glueFee: Number(f.phi_keo),
      colorFee: Number(f.phi_mau), sizeFee: Number(f.phi_size), cuttingFee: Number(f.phi_cat), salePrice: Number(f.don_gia_ban),
      rollLength: f.quy_cach_m, rollsPerTree: f.cuon_cay, commissionPercent: f.hoa_hong, shipping: Number(f.tien_ship),
      vatPercent: js.percent(f.vat_percent), isNewAxis: false,
    });
    return {
      specification: `${f.quy_cach_mm}mm x ${f.quy_cach_m}m (${f.quy_cach_mic}mic)`, quantity: r.product.quantity,
      unitPrice: r.product.salePrice, total: r.product.saleTotal, costTotal: r.product.costTotal, vat: r.vat, vatPercent: r.vatPercent,
      deposit: Number(f.tien_coc), shipping: r.product.shipping, commission: r.product.commission, profit: r.product.profit,
      netProfit: r.product.netProfit, axes,
    };
  }
  const r = js.calculateStandardOrder({
    quantity: f.so_luong, costPrice: Number(f.don_gia_goc), salePrice: Number(f.don_gia_ban), commissionPercent: f.hoa_hong,
    shipping: Number(f.tien_ship), vatPercent: js.percent(f.vat_percent),
  });
  return {
    specification: f.quy_cach, quantity: r.quantity, unitPrice: r.salePrice, total: r.saleTotal, costTotal: r.costTotal,
    vat: r.vat, vatPercent: r.vatPercent, deposit: 0, shipping: r.shipping, commission: r.commission, profit: r.profit,
    netProfit: r.netProfit, axes: [],
  };
}

describe.skipIf(!present)("quote parity with electron (quotations.js + orderMath.js)", () => {
  const js = () => createRequire(jsPath)(jsPath) as Js;

  it("builds the same items and bundle totals on 120 quotes of each type", () => {
    for (const type of ["bang_keo_in", "bang_keo", "truc_in"] as const) {
      for (let seed = 1; seed <= 120; seed++) {
        const s = sizes(type, seed);
        const items = s.map((x) => buildItem(type, x));
        const expected = s.map((x) => jsItem(js(), type, x));
        expect(items).toEqual(expected);
        expect(quoteBundle(items)).toEqual(js().calculateQuoteBundle(expected));
      }
    }
  });
});

describe("stored quotes", () => {
  const row = {
    ten_hang: "Băng keo", so_luong: 100, don_gia_ban: 1000, thanh_tien_ban: 100000, vat: 8000, vat_percent: 8, tien_coc: 0,
    quy_cach_mm: 48, quy_cach_m: 100, quy_cach_mic: 45, loai_truc: "moi", ten_truc: "T1", truc_so_luong: 2,
    truc_gia_ban: 500000, truc_thanh_tien_ban: 1000000, truc_vat: 0, truc_vat_percent: 0, quote_items: [],
  };

  it("makes one item (with its axis) from an old quote row", () => {
    const items = normalizeItems(row, "bang_keo_in");
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ specification: "48mm x 100m (45mic)", total: 100000, axes: [{ name: "T1", total: 1000000 }] });
    expect(grandTotal(items)).toBe(1_108_000);
    expect(listPriceSummary(row, items)).toEqual({ multiple: false, quantity: 100, unitPrice: 1000 });
  });

  it("averages the unit price over several sizes", () => {
    const items = normalizeItems({ quote_items: [{ quantity: 10, unitPrice: 100, total: 1000 }, { quantity: 30, unitPrice: 200, total: 6000 }] }, "bang_keo");
    expect(listPriceSummary({}, items)).toEqual({ multiple: true, quantity: 40, unitPrice: 175 });
  });

  it("reloads desktop form fields (formatted money) into drafts", () => {
    const drafts = draftsFromQuote("bang_keo", {
      quote_items: [{ specification: "5cm", quantity: 10, unitPrice: 100, total: 1000, costTotal: 500, vat: 0,
        fields: { "quy-cach": "5cm", "so-luong": "10", "don-gia-goc": "1,500,000", "don-gia-ban": "12.500", vat: "8" } }],
    });
    expect(drafts[0].fields).toMatchObject({ quy_cach: "5cm", don_gia_goc: "1500000", don_gia_ban: "12500", vat_percent: "8" });
    expect(drafts[0].axes).toEqual([]);
  });

  it("parses money like utils.parseCurrency and checks sizes like prepareQuoteItems", () => {
    expect([parseCurrency("1,234.56"), parseCurrency("1.234,5"), parseCurrency("12.5"), parseCurrency("abc")]).toEqual([1234.56, 1234.5, 12.5, 0]);
    const s: SizeDraft[] = [{ fields: { so_luong: "1", don_gia_ban: "1", quy_cach_m: "0", cuon_cay: "1" }, axes: [] }];
    expect(quoteError("bang_keo_in", s.map((x) => buildItem("bang_keo_in", x)), s)).toMatch(/Quy cách/);
  });

  it("filters a month as its latest occurrence", () => {
    const now = new Date(2026, 10, 9);
    expect(monthRange(11, now)).toEqual(["2026-11-01", "2026-11-30"]);
    expect(monthRange(12, now)).toEqual(["2025-12-01", "2025-12-31"]);
    expect(monthRange(2, now)).toEqual(["2026-02-01", "2026-02-28"]);
  });
});

describe("toQuotePayload", () => {
  const header = { ten_hang: "BG", ten_khach_hang: "Khách", sdt_khach_hang: "", dia_chi_khach_hang: "", customer_id: "" };

  it("keeps the type's keys, parses numbers, drops axes outside printed tape", () => {
    const sizes = [{ fields: { so_luong: "1,5", don_gia_ban: "1000", quy_cach: " 5cm ", don_gia_von: "9", tien_coc: "" }, axes: [{ ten_truc: "T" }] }];
    expect(toQuotePayload({ type: "bang_keo", id: null, header, sizes })).toEqual({
      header: { ten_hang: "BG", ten_khach_hang: "Khách", sdt_khach_hang: "", dia_chi_khach_hang: "" },
      items: [{ so_luong: 1.5, don_gia_ban: 1000, quy_cach: "5cm" }],
    });
    const bki = toQuotePayload({ type: "bang_keo_in", id: null, header, sizes: [{ fields: { so_luong: "2" }, axes: [{ ten_truc: "T", truc_so_luong: "3" }] }] });
    expect(bki?.items).toEqual([{ so_luong: 2, axes: [{ ten_truc: "T", truc_so_luong: 3 }] }]);
  });

  it("rejects a bad number", () => {
    expect(toQuotePayload({ type: "truc_in", id: null, header, sizes: [{ fields: { so_luong: "abc" }, axes: [] }] })).toBeNull();
    expect(toQuotePayload({ type: "truc_in", id: null, header, sizes: [{ fields: { so_luong: "-1" }, axes: [] }] })).toBeNull();
  });
});
