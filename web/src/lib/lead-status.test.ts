import { describe, expect, it } from "vitest";
import { nextStatusOptions, staffTransitionAllowed, transitionAllowed } from "./lead-status";

describe("lead status rules (mirror SQL lead_transition_allowed)", () => {
  it("staff can progress along allowed steps", () => {
    expect(staffTransitionAllowed("assigned", "consulting")).toBe(true);
    expect(staffTransitionAllowed("production", "shipping")).toBe(true);
    expect(staffTransitionAllowed("shipping", "done")).toBe(true);
  });

  it("staff cannot set quoted/accepted or leave terminal states", () => {
    expect(staffTransitionAllowed("consulting", "quoted")).toBe(false);
    expect(staffTransitionAllowed("quoted", "accepted")).toBe(false);
    expect(staffTransitionAllowed("done", "cancelled")).toBe(false);
    expect(staffTransitionAllowed("cancelled", "consulting")).toBe(false);
  });

  it("staff can cancel any open lead", () => {
    expect(staffTransitionAllowed("consulting", "cancelled")).toBe(true);
  });

  it("admin and manager may do anything", () => {
    expect(transitionAllowed("admin", "done", "new")).toBe(true);
    expect(transitionAllowed("manager", "consulting", "quoted")).toBe(true);
  });

  it("offers sensible options in the UI", () => {
    expect(nextStatusOptions("staff", "assigned")).toEqual(["consulting", "cancelled"]);
  });
});
