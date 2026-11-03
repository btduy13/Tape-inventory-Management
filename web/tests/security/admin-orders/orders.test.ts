// Rule: only admin can list, read or create orders through the admin order RPCs (prices, costs,
// profit, customer contacts). A web order is stored with the same money as the form's live
// totals (TS port of orderMath.js), gets a workshop job at cho_san_xuat, and the workshop sees
// its name but no money or contact data.
import { afterAll, describe, expect, it } from "vitest";
import { formTotals } from "@/features/admin-orders/lib/form-totals";
import { orderFormSchema, toOrderPayload } from "@/features/admin-orders/lib/schemas";
import { looseService } from "../helpers/lead-fixtures";
import { SEED_IDS, seedActor } from "../helpers/sessions";
import { vnDate } from "../helpers/workshop";

const created: string[] = [];
afterAll(async () => {
  // Deleting the order deletes its lead-less job (0024 trigger).
  if (created.length) await looseService().from("bang_keo_in_orders").delete().in("id", created);
});

const form = {
  ten_hang: "Băng keo in SEC-ADMIN-ORDER", ten_khach_hang: "Khách bảo mật", sdt_khach_hang: "0909000111",
  dia_chi_khach_hang: "12 Đường Thử, Q1", ngay_du_kien: vnDate(5), quy_cach_mm: "48", quy_cach_m: "100",
  quy_cach_mic: "50", cuon_cay: "6", so_luong: "37", don_gia_von: "812345", phi_keo: "1234", phi_mau: "777",
  don_gia_ban: "19999.5", tien_coc: "100000", vat_percent: "8", ctv: "CTV A", hoa_hong: "7.5", tien_ship: "30000",
  loai_truc: "moi", ten_truc: "Trục logo", truc_so_luong: "2", truc_gia_goc: "333333", truc_gia_ban: "555555",
  truc_vat_percent: "10", truc_hoa_hong: "5", workshop_user_id: SEED_IDS.workshop,
};

describe("admin order RPCs", () => {
  it("non-admin roles get 42501 on list, get and create", async () => {
    for (const role of ["manager", "staff", "ctv", "workshop"] as const) {
      const { db } = await seedActor(role);
      expect((await db.rpc("admin_orders_list", { p_filter: {} })).error?.code, role).toBe("42501");
      expect((await db.rpc("admin_order_get", { p_id: "BK-01-26-001" })).error?.code, role).toBe("42501");
      expect((await db.rpc("admin_order_create", { p_payload: toOrderPayload(orderFormSchema.parse(form)) })).error?.code, role).toBe("42501");
    }
  });

  it("admin creates an order with the same money as the form totals", async () => {
    const { db } = await seedActor("admin");
    const { data, error } = await db.rpc("admin_order_create", { p_payload: toOrderPayload(orderFormSchema.parse(form)) }).single();
    expect(error).toBeNull();
    const { order_id: id, job_id: jobId } = data as { order_id: string; job_id: string };
    created.push(id);
    expect(jobId).toBeTruthy();

    const detail = await db.rpc("admin_order_get", { p_id: id });
    expect(detail.error).toBeNull();
    const d = detail.data as { order: Record<string, unknown>; job: { step: string; workshop_user_id: string }; steps: { note: string }[] };
    const t = formTotals(form);
    const n = (k: string) => Number(d.order[k]);
    expect(n("thanh_tien_goc")).toBe(t.product.costTotal);
    expect(n("thanh_tien_ban")).toBe(t.product.saleTotal);
    expect(n("vat")).toBe(t.vat);
    expect(n("tien_hoa_hong")).toBe(t.product.commission);
    expect(n("loi_nhuan_rong")).toBe(t.product.netProfit);
    expect(n("truc_thanh_tien_ban")).toBe(t.axis.saleTotal);
    expect(n("truc_vat")).toBe(t.axis.vat);
    expect(n("truc_loi_nhuan_rong")).toBe(t.axis.netProfit);
    expect(n("cong_no_khach")).toBe(t.outstanding);
    expect(d.order.sdt_khach_hang).toBe(form.sdt_khach_hang);
    expect(d.order.dia_chi_khach_hang).toBe(form.dia_chi_khach_hang);
    expect(d.job.step).toBe("cho_san_xuat");
    expect(d.job.workshop_user_id).toBe(SEED_IDS.workshop);
    expect(d.steps[0]?.note).toMatch(/^Đơn mới từ web/);

    const list = await db.rpc("admin_orders_list", { p_filter: { q: "SEC-ADMIN-ORDER", step: "cho_san_xuat", limit: 10 } });
    expect(list.error).toBeNull();
    const row = (list.data as Record<string, unknown>[]).find((r) => r.id === id)!;
    expect(Number(row.tong_tien)).toBe(t.combinedSaleTotal + t.vat + t.axis.vat);
    expect(Number(row.loi_nhuan_rong)).toBe(t.combinedNetProfit);

    // The assigned workshop user sees the order name, never money or contacts.
    const ws = await (await seedActor("workshop")).db.rpc("workshop_jobs", { p_job_id: jobId });
    expect(ws.error).toBeNull();
    const job = (ws.data as Record<string, unknown>[])[0]!;
    expect(job.order_name).toBe(form.ten_hang);
    const json = JSON.stringify(ws.data);
    for (const leak of ["0909000111", "Đường Thử", "Khách bảo mật", "19999", "812345"]) expect(json).not.toContain(leak);
  });
});
