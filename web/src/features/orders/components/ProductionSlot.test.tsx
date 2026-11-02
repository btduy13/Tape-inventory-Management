// Regression (UI-8): a new lead shows a one-line note, not the disabled hand-off form.
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { getDictionary } from "@/i18n";
import { ProductionSlot } from "./ProductionSlot";

const c = getDictionary().leadsUi;
afterEach(cleanup);

describe("ProductionSlot", () => {
  it("collapses to a note until a quote is accepted", () => {
    render(<ProductionSlot quotes={[]} status="new" productionOrderId={null}><p>FORM</p></ProductionSlot>);
    expect(screen.getByText(c.productionNotYet)).toBeTruthy();
    expect(screen.queryByText("FORM")).toBeNull();
    expect(screen.getAllByRole("heading")).toHaveLength(1);
  });

  it("renders the hand-off form once accepted", () => {
    render(<ProductionSlot quotes={[]} status="accepted" productionOrderId={null}><p>FORM</p></ProductionSlot>);
    expect(screen.getByText("FORM")).toBeTruthy();
    expect(screen.queryByText(c.productionNotYet)).toBeNull();
  });
});
