import { describe, expect, it } from "vitest";
import type { WorkshopJobRow } from "@/lib/types";
import { addDays, defaultDueDate, dueState, formatDueDate, isIsoDate, vnToday } from "./dates";
import { floorNote, formatSize, jobCode, jobName } from "./group";
import { advanceSchema, assignSchema, convertSchema } from "./schemas";
import { isBackward, isClosedStep, needsDeliveryNote, nextStep, stepOptionsFor, stepRank } from "./steps";

const UUID = "6f1c1f0e-8a7b-4c2d-9e3f-1a2b3c4d5e6f";
// 2026-11-01 20:00 UTC = 2026-11-02 03:00 in Vietnam (UTC+7)
const NOW = new Date("2026-11-01T20:00:00Z");

describe("steps (mirror of production_step_next / advance_production_step, 0024)", () => {
  it("walks the 4-step flow and stops at da_giao", () => {
    expect(nextStep("cho_san_xuat")).toBe("dang_san_xuat");
    expect(nextStep("dang_san_xuat")).toBe("san_sang_giao");
    expect(nextStep("san_sang_giao")).toBe("da_giao");
    expect(nextStep("da_giao")).toBeNull();
    expect(nextStep("huy")).toBeNull();
    // History-only steps read as "being made".
    expect(nextStep("dong_goi")).toBe("san_sang_giao");
    expect(stepRank("dang_in")).toBe(stepRank("dang_san_xuat"));
    expect(isClosedStep("da_giao") && isClosedStep("huy") && !isClosedStep("san_sang_giao")).toBe(true);
  });

  it("workshop: next step only, never back, never huy, never da_giao", () => {
    expect(stepOptionsFor("workshop", "cho_san_xuat")).toEqual(["dang_san_xuat"]);
    expect(stepOptionsFor("workshop", "dang_san_xuat")).toEqual(["san_sang_giao"]);
    // Delivery is confirmed by the delivery note QR, not by a button.
    expect(stepOptionsFor("workshop", "san_sang_giao")).toEqual([]);
    expect(needsDeliveryNote("san_sang_giao") && !needsDeliveryNote("dang_san_xuat")).toBe(true);
    expect(stepOptionsFor("workshop", "da_giao")).toEqual([]);
    for (const r of ["manager", "staff", "ctv"] as const) expect(stepOptionsFor(r, "dang_san_xuat")).toEqual([]);
  });

  it("admin: any other live step (no legacy steps); backwards is detected", () => {
    expect(stepOptionsFor("admin", "dang_san_xuat")).toEqual(["cho_san_xuat", "san_sang_giao", "da_giao", "huy"]);
    expect(stepOptionsFor("admin", "da_giao")).not.toContain("dong_goi");
    expect(isBackward("san_sang_giao", "cho_san_xuat")).toBe(true);
    expect(isBackward("da_giao", "san_sang_giao")).toBe(true);
    expect(isBackward("cho_san_xuat", "da_giao")).toBe(false);
    expect(isBackward("dang_san_xuat", "huy")).toBe(false);
    expect(isBackward("huy", "cho_san_xuat")).toBe(false);
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
    expect(dueState("2026-11-01", "dang_san_xuat", NOW)).toBe("overdue");
    expect(dueState("2026-11-02", "dang_san_xuat", NOW)).toBe("today");
    expect(dueState("2026-11-04", "dang_san_xuat", NOW)).toBe("soon");
    expect(dueState("2026-11-05", "dang_san_xuat", NOW)).toBe("ok");
    expect(dueState("2026-10-01", "da_giao", NOW)).toBe("ok");
    expect(dueState(null, "dang_san_xuat", NOW)).toBe("none");
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
    expect(advanceSchema.safeParse({ jobId: UUID, to: "dang_san_xuat" }).success).toBe(true);
    expect(advanceSchema.safeParse({ jobId: UUID, to: "shipping" }).success).toBe(false);
    expect(advanceSchema.parse({ jobId: UUID, to: "dang_san_xuat", note: ` ${"a".repeat(1200)} ` }).note).toHaveLength(1000);
  });

  it("assign: empty user = unassign", () => {
    expect(assignSchema.parse({ leadId: UUID, userId: "" })).toEqual({ leadId: UUID, userId: null });
    expect(assignSchema.safeParse({ leadId: UUID, userId: "nope" }).success).toBe(false);
  });
});

describe("grouping", () => {
  const job = (over: Partial<WorkshopJobRow>): WorkshopJobRow => ({
    job_id: UUID, lead_id: UUID, lead_code: "L2611-00001", order_id: "BK-11-26-001", step: "dang_san_xuat",
    due_date: "2026-11-09", production_note: null, workshop_user_id: null, workshop_user_name: null,
    quantity: 100, width_mm: 48, length_m: 100, thickness_mic: 50, colors: ["#fff"], print_text: null,
    design_json: null, preview_path: null, logo_path: null, desktop_delivered: false, converted_at: null,
    updated_at: "2026-11-01T00:00:00Z", order_name: null, order_table: "bang_keo_in_orders", ...over,
  });

  it("jobCode falls back to the job id", () => {
    expect(jobCode(job({ order_id: null, lead_code: null }))).toBe(UUID);
  });

  it("names a job by its order name, else the print text, else the size", () => {
    expect(jobName(job({ order_name: "  Băng keo Cà phê Mộc  ", print_text: "MOC" }))).toBe("Băng keo Cà phê Mộc");
    expect(jobName(job({ order_name: null, print_text: "MOC" }))).toBe("Băng keo in “MOC”");
    expect(jobName(job({ order_name: " ", print_text: null }))).toBe("Băng keo 48mm × 100m");
  });

  it("formats the size", () => {
    expect(formatSize({ width_mm: 48, length_m: 100.5, thickness_mic: null })).toBe("48mm × 100.5m × ?mic");
  });
});

describe("floorNote (workshop never sees order codes)", () => {
  it("strips the hand-off and new-order prefixes, keeps the office note", () => {
    expect(floorNote("Chuyển sang sản xuất: BK-11-26-001 — In gấp")).toBe("In gấp");
    expect(floorNote("Chuyển sang sản xuất: BK-11-26-001")).toBe("");
    expect(floorNote("Đơn mới từ web: BK-11-26-003")).toBe("");
    expect(floorNote("Đơn mới từ app: BK-11-26-002")).toBe("");
    expect(floorNote("Đơn mới từ app")).toBe("");
    expect(floorNote("Đơn mới từ web")).toBe("");
    expect(floorNote("làm lại")).toBe("làm lại");
  });
});
