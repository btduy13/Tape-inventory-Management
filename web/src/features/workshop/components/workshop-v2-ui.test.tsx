import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { ROUTES } from "@/lib/routes";
import type { DeliveryNoteCreated } from "@/lib/types";
import { toPrintableNote } from "../lib/delivery";
import { AdvanceStepForm } from "./AdvanceStepForm";
import { DeliveryNoteSheet, PRINT_CSS } from "./DeliveryNoteSheet";

vi.mock("../server/actions", () => ({ advanceStepAction: vi.fn(), createDeliveryNoteAction: vi.fn() }));

afterEach(cleanup);

const JOB = "7f1c1f0e-8a7b-4c2d-9e3f-1a2b3c4d5e6f";

describe("<AdvanceStepForm> (xưởng v2: 4 steps, no going back)", () => {
  it("workshop: one big 'Chuyển sang <next>' button, no step picker", () => {
    render(<AdvanceStepForm jobId={JOB} code="Băng keo Mộc" step="cho_san_xuat" role="workshop" />);
    expect(screen.getByRole("button", { name: "Chuyển sang Đang sản xuất" })).toBeInTheDocument();
    expect(screen.queryByRole("combobox")).toBeNull();
    expect(document.querySelector("input[name=to]")).toHaveValue("dang_san_xuat");
  });

  it("workshop at Sẵn sàng giao: only 'Tạo phiếu giao hàng', no Đã giao button", () => {
    render(<AdvanceStepForm jobId={JOB} code="Băng keo Mộc" step="san_sang_giao" role="workshop" />);
    const link = screen.getByRole("link", { name: "Tạo phiếu giao hàng" });
    expect(link).toHaveAttribute("href", ROUTES.workshopDeliveryNote(JOB));
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.queryByText(/Đã giao/)).toBeNull();
  });

  it("admin: any step; moving back asks in red, forward does not", () => {
    render(<AdvanceStepForm jobId={JOB} code="BK-1" step="san_sang_giao" role="admin" />);
    const select = screen.getByRole("combobox");
    expect(within(select).getAllByRole("option").map((o) => o.getAttribute("value"))).toEqual(["cho_san_xuat", "dang_san_xuat", "da_san_xuat", "da_giao", "huy"]);
    expect(screen.getByRole("link", { name: "Tạo phiếu giao hàng" })).toBeInTheDocument();

    fireEvent.change(select, { target: { value: "cho_san_xuat" } });
    const back = screen.getByRole("button", { name: "Lùi về Chờ sản xuất", hidden: true });
    expect(back.className).toContain("bg-vt-red-deep");
    expect(screen.getByText("Lùi BK-1 về Chờ sản xuất?")).toBeInTheDocument();

    fireEvent.change(select, { target: { value: "da_giao" } });
    expect(screen.queryByRole("button", { name: /Lùi về/, hidden: true })).toBeNull();
    expect(screen.getByText("Đặt BK-1 sang Đã giao?")).toBeInTheDocument();
  });
});

const created: DeliveryNoteCreated = {
  note_id: "11111111-1111-4111-8111-111111111111", token: "T".repeat(43), job_id: JOB, order_id: "BK-11-26-009",
  order_name: "Băng keo Cà phê Mộc", quantity: 1200, width_mm: 48, length_m: 100, thickness_mic: 50,
  colors: ["Đỏ", "Xanh"], print_text: null, due_date: "2026-11-09", recipient_name: "Anh Minh",
  recipient_phone: "0901234567", recipient_address: "12 Lê Lợi, Q1", created_at: "2026-11-03T03:00:00Z",
};

describe("delivery note (phiếu giao hàng)", () => {
  it("never passes the raw token on; the order code only for admin", () => {
    const floor = toPrintableNote(created, "workshop", "x");
    expect(JSON.stringify(floor)).not.toContain(created.token);
    expect(floor.orderId).toBeNull();
    expect(toPrintableNote(created, "admin", "x").orderId).toBe("BK-11-26-009");
    expect(toPrintableNote({ ...created, order_name: "  " }, "workshop", "Phiếu").orderName).toBe("Phiếu");
  });

  it("prints name, specs, recipient, QR; workshop sheet has no order code", () => {
    render(<DeliveryNoteSheet note={toPrintableNote(created, "workshop", "x")} qr={"<svg viewBox=\"0 0 1 1\"><path d=\"M0 0\"/></svg>"} nonce="abc" />);
    const sheet = screen.getByRole("article", { name: "Phiếu giao hàng" });
    expect(sheet).toHaveAttribute("data-print-sheet");
    expect(screen.getByTestId("note-name")).toHaveTextContent("Băng keo Cà phê Mộc");
    for (const text of ["48mm × 100m × 50mic", "1.200 cuộn", "Đỏ, Xanh", "Anh Minh", "0901234567", "12 Lê Lợi, Q1", "09/11/2026"]) {
      expect(sheet).toHaveTextContent(text);
    }
    expect(sheet).not.toHaveTextContent("BK-11-26-009");
    expect(sheet.querySelector("svg")).not.toBeNull();
    expect(sheet.querySelector("[style]")).toBeNull();
    expect(sheet.querySelector("style")?.getAttribute("nonce")).toBe("abc");
    expect(PRINT_CSS).toContain("size:A5");
  });
});
