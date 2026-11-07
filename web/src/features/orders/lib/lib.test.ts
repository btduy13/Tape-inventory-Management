import { describe, expect, it } from "vitest";
import { buildTimeline, actorIds, formatDateTime } from "./timeline";
import { countUnread, isUnread, markSeen, parseBaseline, parseSeen } from "./unread";
import { affectedLeadId, leadFilter, lostAssignment } from "./realtime-events";
import { addNoteSchema, changeStatusSchema } from "./schemas";
import { classifyDbError } from "./action-state";

const ID = "6f1c1f0e-8a7b-4c2d-9e3f-1a2b3c4d5e6f";

describe("timeline", () => {
  it("merges log and notes newest first", () => {
    const tl = buildTimeline(
      [
        { id: 1, created_at: "2026-01-01T00:00:00Z", changed_by: null, from_status: null, to_status: "new", note: null },
        { id: 2, created_at: "2026-01-03T00:00:00Z", changed_by: "u1", from_status: "new", to_status: "assigned", note: "x" },
      ],
      [{ id: 9, created_at: "2026-01-02T00:00:00Z", author_id: "u2", body: "hello" }],
    );
    expect(tl.map((e) => e.key)).toEqual(["s2", "n9", "s1"]);
    expect(actorIds(tl)).toEqual(["u1", "u2"]);
  });

  it("formats invalid dates as empty", () => {
    expect(formatDateTime("nope")).toBe("");
    expect(formatDateTime("2026-01-01T00:00:00Z")).not.toBe("");
  });
});

describe("unread", () => {
  const baseline = "2026-01-02T00:00:00.000Z";
  const leads = [
    { id: "a", updated_at: "2026-01-01T00:00:00Z" }, // before baseline
    { id: "b", updated_at: "2026-01-03T00:00:00Z" }, // after baseline, never seen
    { id: "c", updated_at: "2026-01-03T00:00:00Z" }, // seen after update
  ];
  const seen = { c: "2026-01-04T00:00:00Z" };

  it("counts leads changed since last seen / baseline plus live events", () => {
    expect(countUnread(leads, seen, baseline, new Set())).toBe(1);
    expect(countUnread(leads, seen, baseline, new Set(["a"]))).toBe(2);
    expect(isUnread(leads[2], seen, baseline, new Set())).toBe(false);
  });

  it("markSeen caps size and keeps newest", () => {
    let m = {};
    for (let i = 0; i < 510; i++) m = markSeen(m, `l${i}`, new Date(Date.UTC(2026, 0, 1, 0, 0, i)).toISOString());
    expect(Object.keys(m)).toHaveLength(500);
    expect(m).not.toHaveProperty("l0");
    expect(m).toHaveProperty("l509");
  });

  it("parses untrusted storage defensively", () => {
    expect(parseSeen("{bad")).toEqual({});
    expect(parseSeen("[1]")).toEqual({});
    expect(parseSeen(JSON.stringify({ a: "2026-01-01T00:00:00Z", b: 3, c: "x" }))).toEqual({ a: "2026-01-01T00:00:00Z" });
    expect(parseBaseline(null, "now-iso")).toBe("now-iso");
    expect(parseBaseline("2026-01-01T00:00:00Z", "n")).toBe("2026-01-01T00:00:00Z");
  });
});

describe("realtime events", () => {
  it("finds the lead id per table", () => {
    expect(affectedLeadId({ table: "leads", eventType: "UPDATE", new: { id: "L" }, old: null })).toBe("L");
    expect(affectedLeadId({ table: "lead_notes", eventType: "INSERT", new: { lead_id: "L2" }, old: null })).toBe("L2");
    expect(affectedLeadId({ table: "leads", eventType: "DELETE", new: {}, old: { id: "L3" } })).toBe("L3");
    expect(affectedLeadId({ table: "quotes", eventType: "INSERT", new: {}, old: {} })).toBeNull();
  });

  it("detects unassignment of the current user", () => {
    const p = { table: "leads", eventType: "UPDATE" as const, old: { assigned_to: "me" }, new: { assigned_to: "other" } };
    expect(lostAssignment(p, "me")).toBe(true);
    expect(lostAssignment({ ...p, new: { assigned_to: "me" } }, "me")).toBe(false);
    expect(lostAssignment({ ...p, table: "lead_notes" }, "me")).toBe(false);
  });

  it("builds filters", () => {
    expect(leadFilter("leads", "x")).toBe("id=eq.x");
    expect(leadFilter("lead_notes", "x")).toBe("lead_id=eq.x");
  });
});

describe("schemas", () => {
  it("validates status change", () => {
    expect(changeStatusSchema.parse({ leadId: ID, to: "consulting", note: "  " }).note).toBeNull();
    expect(changeStatusSchema.safeParse({ leadId: ID, to: "bogus" }).success).toBe(false);
    expect(changeStatusSchema.safeParse({ leadId: "1", to: "done" }).success).toBe(false);
    expect(changeStatusSchema.safeParse({ leadId: ID, to: "done", note: "x".repeat(1001) }).success).toBe(false);
  });

  it("validates notes", () => {
    expect(addNoteSchema.safeParse({ leadId: ID, body: "   " }).success).toBe(false);
  });

  it("classifies db errors", () => {
    expect(classifyDbError({ code: "42501" })).toBe("forbidden");
    expect(classifyDbError({ code: "P0002" })).toBe("notFound");
    expect(classifyDbError({ code: "22023" })).toBe("invalid");
    expect(classifyDbError(null)).toBe("generic");
  });
});
