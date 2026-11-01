// Rule: a workshop user sees ONLY the production jobs an admin assigned to it, and only
// production specs (no price, VAT, phone, email, company, customer name / note). Other roles
// cannot use the workshop RPC at all; admin sees every job.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { cleanupLeads, looseService } from "../helpers/lead-fixtures";
import { looseAnon, SEED_IDS, seedActor } from "../helpers/sessions";
import { assignJob, cleanupOrders, createAcceptedLead } from "../helpers/workshop";

const FORBIDDEN_KEYS = ["price", "unit_price", "subtotal", "vat", "vat_amount", "vat_percent", "total", "phone", "email",
  "company", "customer_name", "customer_note", "thanh_tien_ban", "don_gia_ban", "cong_no_khach", "ten_khach_hang"];

let mine: string;
let other: string;

beforeAll(async () => {
  mine = await createAcceptedLead("ws-vis-mine");
  other = await createAcceptedLead("ws-vis-other");
  await assignJob(mine, SEED_IDS.workshop);
  await assignJob(other, SEED_IDS.workshop2);
});
afterAll(async () => {
  await cleanupOrders([mine, other]);
  await cleanupLeads([mine, other]);
});

describe("workshop_jobs: own jobs, specs only", () => {
  it("workshop gets its assigned job and not workshop2's", async () => {
    const { data, error } = await (await seedActor("workshop")).db.rpc("workshop_jobs");
    expect(error).toBeNull();
    const leads = (data as Array<{ lead_id: string }>).map((r) => r.lead_id);
    expect(leads).toContain(mine);
    expect(leads).not.toContain(other);
  });

  it("returned rows carry no price / contact / customer fields or values", async () => {
    const { data } = await (await seedActor("workshop")).db.rpc("workshop_jobs");
    const row = (data as Array<Record<string, unknown>>).find((r) => r.lead_id === mine)!;
    for (const key of FORBIDDEN_KEYS) expect(Object.keys(row), key).not.toContain(key);
    const json = JSON.stringify(data);
    expect(json).not.toContain("sec-customer@example.com");
    expect(json).not.toContain("0900000000");
    expect(json).not.toContain("SEC Co");
    expect(json).not.toContain("security suite fixture");
    expect(row).toMatchObject({ quantity: 10, print_text: "SEC", step: "cho_san_xuat", order_id: null });
  });

  it("workshop2 cannot read workshop's job even by id", async () => {
    const job = (await looseService().from("production_jobs").select("id").eq("lead_id", mine).single()).data as { id: string };
    const { data } = await (await seedActor("workshop2")).db.rpc("workshop_jobs", { p_job_id: job.id });
    expect(data).toEqual([]);
  });

  it("anon, staff, ctv and manager cannot call workshop_jobs", async () => {
    const callers = [
      ["anon", looseAnon()],
      ["staff", (await seedActor("staff")).db],
      ["ctv", (await seedActor("ctv")).db],
      ["manager", (await seedActor("manager")).db],
    ] as const;
    for (const [name, db] of callers) {
      const { data, error } = await db.rpc("workshop_jobs");
      expect(error, name).not.toBeNull();
      expect(data ?? [], name).toEqual([]);
    }
  });

  it("admin sees every job (overview)", async () => {
    const { data } = await (await seedActor("admin")).db.rpc("workshop_jobs");
    const leads = (data as Array<{ lead_id: string }>).map((r) => r.lead_id);
    expect(leads).toEqual(expect.arrayContaining([mine, other]));
  });
});

describe("workshop has no direct access to sales / price / legacy data", () => {
  for (const table of ["leads", "designs", "quotes", "quote_lines", "lead_notes", "lead_status_log", "lead_assignments"]) {
    it(`${table}: no rows`, async () => {
      const { data } = await (await seedActor("workshop")).db.from(table).select("*").limit(5);
      expect(data ?? [], table).toEqual([]);
    });
  }

  it("legacy bang_keo_in_orders is not reachable", async () => {
    const { data, error } = await (await seedActor("workshop")).db.from("bang_keo_in_orders").select("*").limit(1);
    expect(error).not.toBeNull();
    expect(data ?? []).toEqual([]);
  });

  it("profiles: only its own row", async () => {
    const { data } = await (await seedActor("workshop")).db.from("profiles").select("id");
    expect((data ?? []).map((r: { id: string }) => r.id)).toEqual([SEED_IDS.workshop]);
  });

  it("production_jobs rows hold no price or contact columns", async () => {
    const { data } = await (await seedActor("workshop")).db.from("production_jobs").select("*");
    expect((data ?? []).length).toBeGreaterThan(0);
    for (const key of FORBIDDEN_KEYS) expect(Object.keys(data![0]), key).not.toContain(key);
  });

  it("staff / manager read no production jobs", async () => {
    for (const role of ["staff", "manager"] as const) {
      const { data } = await (await seedActor(role)).db.from("production_jobs").select("id");
      expect(data ?? [], role).toEqual([]);
    }
  });
});
