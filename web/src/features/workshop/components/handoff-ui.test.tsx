import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { handoffVatLabel } from "../lib/vat";
import { ConvertForm } from "./ConvertForm";
import { CONTAIN_SCROLLERS, JobStepper } from "./JobStepper";

vi.mock("../server/actions", () => ({ convertToProductionAction: vi.fn() }));

afterEach(cleanup);

const LEAD = "6f1c1f0e-8a7b-4c2d-9e3f-1a2b3c4d5e6f";

describe("<JobStepper> (QC UI-1: no sideways scroll at 390px)", () => {
  it("wraps the kit strip so its scroller is positioned and clips the sr-only spans", () => {
    render(<JobStepper step="da_giao" />);
    const strip = screen.getByRole("list");
    expect(strip.className).toContain("overflow-x-auto");
    expect(strip.closest("div")?.parentElement?.className).toBe(CONTAIN_SCROLLERS);
    expect(CONTAIN_SCROLLERS).toBe("[&_.overflow-x-auto]:relative");
  });
});

describe("hand-off VAT (QC FLOW-1: VAT copied from the accepted quote, shown read-only)", () => {
  it("labels the quote VAT, or 0% when there is no accepted quote", () => {
    expect(handoffVatLabel(10)).toBe("VAT 10% theo báo giá đã chốt");
    expect(handoffVatLabel(8.5)).toBe("VAT 8,5% theo báo giá đã chốt");
    expect(handoffVatLabel(null)).toBe("Chưa có báo giá đã chốt: VAT 0%");
  });

  it("admin hand-off shows the VAT but has no VAT input (the RPC never reads one)", () => {
    const { container } = render(<ConvertForm leadId={LEAD} defaultDue="2026-11-09" minDue="2026-11-02" showVat vatPercent={10} />);
    expect(screen.getByTestId("handoff-vat")).toHaveTextContent("VAT 10% theo báo giá đã chốt");
    expect(container.querySelector("[name*=vat i]")).toBeNull();
  });

  it("workshop pages never show VAT (no prices for workshop)", () => {
    render(<ConvertForm leadId={LEAD} defaultDue="2026-11-09" minDue="2026-11-02" />);
    expect(screen.queryByTestId("handoff-vat")).toBeNull();
    expect(screen.queryByText(/VAT/)).toBeNull();
  });
});
