// Rule: "Chuyển sang sản xuất" is allowed for admin and for the workshop user assigned to the
// lead's production job, only with a due date >= today (Vietnam). The legacy order carries the
// accepted quote's VAT, and its debt (cong_no_khach) includes VAT like the Electron formula.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { cleanupLeads, looseService } from "../helpers/lead-fixtures";
import { looseAnon, SEED_IDS, seedActor } from "../helpers/sessions";
import { assignJob, cleanupOrders, createAcceptedLead, jobOf, leadStatus, vnDate } from "../helpers/workshop";

let byWorkshop: string;
let byAdmin: string;

beforeAll(async () => {
  byWorkshop = await createAcceptedLead("ws-convert-w");
  byAdmin = await createAcceptedLead("ws-convert-a");
  await assignJob(byWorkshop, SEED_IDS.workshop);
});
afterAll(async () => {
  await cleanupOrders([byWorkshop, byAdmin]);
  await cleanupLeads([byWorkshop, byAdmin]);
});

describe("convert permissions", () => {
  it("anon, staff, ctv, manager and workshop2 are rejected; nothing is created", async () => {
    const callers = [
      ["anon", looseAnon()],
      ["staff", (await seedActor("staff")).db],
      ["ctv", (await seedActor("ctv")).db],
      ["manager", (await seedActor("manager")).db],
      ["workshop2", (await seedActor("workshop2")).db],
    ] as const;
    for (const [name, db] of callers) {
      const { error } = await db.rpc("convert_lead_to_production", { p_lead_id: byWorkshop, p_due_date: vnDate(7) });
      expect(error, name).not.toBeNull();
    }
    expect((await jobOf(byWorkshop))?.order_id).toBeNull();
    expect(await leadStatus(byWorkshop)).toBe("accepted");
  });

  it("workshop cannot convert a lead that is not assigned to it", async () => {
    const { error } = await (await seedActor("workshop")).db.rpc("convert_lead_to_production", { p_lead_id: byAdmin, p_due_date: vnDate(7) });
    expect(error?.code).toBe("42501");
  });

  it("the old one-argument signature is gone", async () => {
    const { error } = await (await seedActor("admin")).db.rpc("convert_lead_to_production", { p_lead_id: byAdmin });
    expect(error).not.toBeNull();
    expect((await jobOf(byAdmin))?.order_id ?? null).toBeNull();
  });
});

describe("due date validation", () => {
  it("past or missing due date is rejected (also for admin)", async () => {
    const ws = (await seedActor("workshop")).db;
    expect((await ws.rpc("convert_lead_to_production", { p_lead_id: byWorkshop, p_due_date: vnDate(-1) })).error?.code).toBe("22023");
    expect((await ws.rpc("convert_lead_to_production", { p_lead_id: byWorkshop, p_due_date: null })).error?.code).toBe("22023");
    const admin = (await seedActor("admin")).db;
    expect((await admin.rpc("convert_lead_to_production", { p_lead_id: byAdmin, p_due_date: vnDate(-3) })).error?.code).toBe("22023");
    expect(await leadStatus(byWorkshop)).toBe("accepted");
  });

  it("workshop cannot pick the workshop user", async () => {
    const { error } = await (await seedActor("workshop")).db.rpc("convert_lead_to_production", {
      p_lead_id: byWorkshop, p_due_date: vnDate(3), p_workshop_user_id: SEED_IDS.workshop2,
    });
    expect(error?.code).toBe("42501");
  });
});

describe("hand-off result", () => {
  it("assigned workshop converts with a future due date", async () => {
    const { data, error } = await (await seedActor("workshop")).db.rpc("convert_lead_to_production", {
      p_lead_id: byWorkshop, p_due_date: vnDate(5), p_note: "SEC production note",
    });
    expect(error).toBeNull();
    expect(data).toMatch(/^BK-\d{2}-\d{2}-\d{3,}$/);
    const job = await jobOf(byWorkshop);
    expect(job?.order_id).toBe(data);
    expect(await leadStatus(byWorkshop)).toBe("production");
  });

  it("legacy order: due date, VAT of the accepted quote, debt includes VAT", async () => {
    const svc = looseService();
    const job = await jobOf(byWorkshop);
    const { data: order } = await svc.from("bang_keo_in_orders").select("*").eq("id", job!.order_id!).single();
    const quote = (await svc.from("quotes").select("subtotal, vat_percent, vat_amount, total").eq("lead_id", byWorkshop).eq("status", "accepted").single()).data!;
    expect(order.ngay_du_kien).toBe(vnDate(5));
    expect(Number(order.thanh_tien_ban)).toBe(Number(quote.subtotal));
    expect(Number(order.vat)).toBe(Number(quote.vat_amount));
    expect(Number(order.vat_percent)).toBe(Number(quote.vat_percent));
    // electron/js/orderMath.js customerDebtSqlExpression('bang_keo_in_orders') without axis:
    const electronDebt = Math.max(Number(order.thanh_tien_ban ?? 0) + Number(order.vat ?? 0) - Number(order.tien_coc ?? 0), 0);
    expect(Number(order.cong_no_khach)).toBe(electronDebt);
    expect(Number(order.cong_no_khach)).toBe(Number(quote.total));
    expect(Number(quote.vat_amount)).toBe(800);
    expect(order).toMatchObject({ da_giao: false, da_tat_toan: false, is_quote: false });
  });

  it("admin converts (due date today) and assigns workshop2 in one call", async () => {
    const { error } = await (await seedActor("admin")).db.rpc("convert_lead_to_production", {
      p_lead_id: byAdmin, p_due_date: vnDate(0), p_workshop_user_id: SEED_IDS.workshop2,
    });
    expect(error).toBeNull();
    expect((await jobOf(byAdmin))?.workshop_user_id).toBe(SEED_IDS.workshop2);
  });

  it("staff cannot set the production link directly (guard)", async () => {
    const { data, error } = await (await seedActor("staff")).db
      .from("leads").update({ production_order_id: "BK-HACK" }).eq("id", byWorkshop).select("id");
    expect(error !== null || (data ?? []).length === 0).toBe(true);
    expect((await jobOf(byWorkshop))?.order_id).not.toBe("BK-HACK");
  });
});
