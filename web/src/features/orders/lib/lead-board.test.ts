import { describe, expect, it } from "vitest";
import { LEAD_BADGE_TONE, activeLeadTab, countLeadTabs, leadStepIndex, leadWaiting, waitingParts } from "./lead-board";

const H = 3_600_000;
const NOW = Date.parse("2026-11-09T12:00:00Z");
const ago = (h: number) => new Date(NOW - h * H).toISOString();

describe("leadWaiting", () => {
  it("tones by age: grey < 4h, amber 4-24h, red > 24h", () => {
    expect(leadWaiting("new", ago(3.9), NOW)?.tone).toBe("grey");
    expect(leadWaiting("new", ago(4), NOW)?.tone).toBe("amber");
    expect(leadWaiting("consulting", ago(24), NOW)?.tone).toBe("amber");
    expect(leadWaiting("quoted", ago(25), NOW)?.tone).toBe("red");
  });
  it("is null for workshop / closed statuses and bad dates", () => {
    for (const s of ["production", "shipping", "done", "cancelled"] as const) expect(leadWaiting(s, ago(50), NOW)).toBeNull();
    expect(leadWaiting("new", "nope", NOW)).toBeNull();
  });
  it("clamps future timestamps to 0", () => {
    expect(leadWaiting("new", ago(-2), NOW)?.hours).toBe(0);
  });
});

describe("waitingParts", () => {
  it("picks the unit", () => {
    expect(waitingParts(0.5)).toEqual({ unit: "lessHour", count: 0 });
    expect(waitingParts(5.9)).toEqual({ unit: "hours", count: 5 });
    expect(waitingParts(49)).toEqual({ unit: "days", count: 2 });
  });
});

describe("status badge tone", () => {
  it("grey new, blue working, amber waiting on customer, green won, red lost", () => {
    expect(LEAD_BADGE_TONE.new).toBe("grey");
    expect(LEAD_BADGE_TONE.consulting).toBe("blue");
    expect(LEAD_BADGE_TONE.quoted).toBe("amber");
    expect(LEAD_BADGE_TONE.done).toBe("green");
    expect(LEAD_BADGE_TONE.cancelled).toBe("red");
  });
});

describe("tabs", () => {
  it("matches the status filter regardless of order", () => {
    expect(activeLeadTab(undefined)).toBe("all");
    expect(activeLeadTab(["consulting", "assigned"])).toBe("working");
    expect(activeLeadTab(["new", "quoted"])).toBeNull();
  });
  it("counts each status into one tab plus all", () => {
    const c = countLeadTabs([{ status: "new" }, { status: "assigned" }, { status: "shipping" }, { status: "cancelled" }]);
    expect(c).toEqual({ all: 4, new: 1, working: 1, quoted: 0, won: 1, closed: 1 });
  });
});

describe("leadStepIndex", () => {
  it("maps statuses to the 5-step strip", () => {
    expect(leadStepIndex("new")).toBe(0);
    expect(leadStepIndex("quoted")).toBe(3);
    expect(leadStepIndex("production")).toBe(4);
    expect(leadStepIndex("cancelled")).toBe(-1);
  });
});
