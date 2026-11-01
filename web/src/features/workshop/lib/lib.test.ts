import { describe, expect, it } from "vitest";
import type { WorkshopJobRow } from "@/lib/types";
import { addDays, defaultDueDate, dueState, formatDueDate, isIsoDate, vnToday } from "./dates";
import { formatSize, groupJobs } from "./group";
import { advanceSchema, assignSchema, convertSchema } from "./schemas";
import { canMoveTo, isClosedStep, nextStep, stepOptionsFor } from "./steps";

const UUID = "6f1c1f0e-8a7b-4c2d-9e3f-1a2b3c4d5e6f";
// 2026-11-01 20:00 UTC = 2026-11-02 03:00 in Vietnam (UTC+7)
const NOW = new Date("2026-11-01T20:00:00Z");

describe("steps (mirror of production_step_next / advance_production_step)", () => {
  it("walks the flow and stops at da_giao", () => {
    expect(nextStep("cho_san_xuat")).toBe("dang_in");
    expect(nextStep("dang_in")).toBe("dang_cat_cuon");
    expect(nextStep("dang_cat_cuon")).toBe("dong_goi");
    expect(nextStep("dong_goi")).toBe("san_sang_giao");
    expect(nextStep("san_sang_giao")).toBe("da_giao");
    expect(nextStep("da_giao")).toBeNull();
    expect(nextStep("huy")).toBeNull();
    expect(isClosedStep("da_giao") && isClosedStep("huy") && !isClosedStep("dong_goi")).toBe(true);
  });

  it("workshop: next step only, never huy; admin: any other step", () => {
    expect(stepOptionsFor("workshop", "dang_in")).toEqual(["dang_cat_cuon"]);
    expect(stepOptionsFor("workshop", "da_giao")).toEqual([]);
    expect(canMoveTo("workshop", "dang_in", "dong_goi")).toBe(false);
    expect(canMoveTo("workshop", "dang_in", "huy")).toBe(false);
    expect(stepOptionsFor("admin", "da_giao")).toContain("dong_goi");
    expect(stepOptionsFor("admin", "dang_in")).toContain("huy");
    expect(stepOptionsFor("admin", "dang_in")).not.toContain("dang_in");
    for (const r of ["manager", "staff", "ctv"] as const) expect(stepOptionsFor(r, "dang_in")).toEqual([]);
  });
});

describe("due dates (Vietnam calendar)", () => {
  it("uses the Vietnam date, not UTC", () => {
    expect(vnToday(NOW)).toBe("2026-11-02");
    expect(defaultDueDate(NOW)).toBe("2026-11-09");
  });

  it("validates and shifts ISO dates", () => {
    expect(isIsoDate("2026-02-29")).toBe(false);
    expect(isIsoDate("2028-02-29")).toBe(true);
    expect(isIsoDate("02/11/2026")).toBe(false);
    expect(addDays("2026-12-30", 3)).toBe("2027-01-02");
    expect(formatDueDate("2026-11-09")).toBe("09/11/2026");
    expect(formatDueDate(null)).toBe("—");
  });

  it("highlights overdue / today / soon; closed jobs are never overdue", () => {
    expect(dueState("2026-11-01", "dang_in", NOW)).toBe("overdue");
    expect(dueState("2026-11-02", "dang_in", NOW)).toBe("today");
    expect(dueState("2026-11-04", "dang_in", NOW)).toBe("soon");
    expect(dueState("2026-11-05", "dang_in", NOW)).toBe("ok");
    expect(dueState("2026-10-01", "da_giao", NOW)).toBe("ok");
    expect(dueState(null, "dang_in", NOW)).toBe("none");
  });
});

describe("schemas", () => {
  it("convert: due date required, >= today (Vietnam), workshop user optional", () => {
    const schema = convertSchema(NOW);
    expect(schema.safeParse({ leadId: UUID, dueDate: "2026-11-02" }).success).toBe(true);
    expect(schema.safeParse({ leadId: UUID, dueDate: "2026-11-01" }).success).toBe(false);
    expect(schema.safeParse({ leadId: UUID, dueDate: "" }).success).toBe(false);
    expect(schema.safeParse({ leadId: UUID }).success).toBe(false);
    expect(schema.safeParse({ leadId: "x", dueDate: "2026-11-09" }).success).toBe(false);
    const parsed = schema.parse({ leadId: UUID, dueDate: "2026-11-09", note: "  ", workshopUserId: "" });
    expect(parsed).toEqual({ leadId: UUID, dueDate: "2026-11-09", note: null, workshopUserId: null });
  });

  it("advance: known steps only, note trimmed and capped", () => {
    expect(advanceSchema.safeParse({ jobId: UUID, to: "dang_in" }).success).toBe(true);
    expect(advanceSchema.safeParse({ jobId: UUID, to: "shipping" }).success).toBe(false);
    expect(advanceSchema.parse({ jobId: UUID, to: "dang_in", note: ` ${"a".repeat(1200)} ` }).note).toHaveLength(1000);
  });

  it("assign: empty user = unassign", () => {
    expect(assignSchema.parse({ leadId: UUID, userId: "" })).toEqual({ leadId: UUID, userId: null });
    expect(assignSchema.safeParse({ leadId: UUID, userId: "nope" }).success).toBe(false);
  });
});

describe("grouping", () => {
  const job = (over: Partial<WorkshopJobRow>): WorkshopJobRow => ({
    job_id: UUID, lead_id: UUID, lead_code: "L2611-00001", order_id: "BK-11-26-001", step: "dang_in",
    due_date: "2026-11-09", production_note: null, workshop_user_id: null, workshop_user_name: null,
    quantity: 100, width_mm: 48, length_m: 100, thickness_mic: 50, colors: ["#fff"], print_text: null,
    design_json: null, preview_path: null, logo_path: null, desktop_delivered: false, converted_at: null,
    updated_at: "2026-11-01T00:00:00Z", ...over,
  });

  it("puts unconverted jobs in pending and sorts by due date", () => {
    const g = groupJobs([
      job({ lead_code: "B", due_date: "2026-11-10" }),
      job({ lead_code: "A", due_date: "2026-11-05" }),
      job({ order_id: null, step: "cho_san_xuat", lead_code: "P" }),
      job({ step: "huy", lead_code: "H" }),
    ]);
    expect(g.pending.map((j) => j.lead_code)).toEqual(["P"]);
    expect(g.dang_in.map((j) => j.lead_code)).toEqual(["A", "B"]);
    expect(g.huy).toHaveLength(1);
    expect(g.cho_san_xuat).toHaveLength(0);
  });

  it("formats the size", () => {
    expect(formatSize({ width_mm: 48, length_m: 100.5, thickness_mic: null })).toBe("48mm × 100.5m × ?mic");
  });
});
