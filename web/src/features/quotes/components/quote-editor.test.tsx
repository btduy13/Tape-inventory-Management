// Regression (QC-11): "Lưu nháp" must show a success status that survives the server refresh,
// and "Gửi báo giá" uses an inline confirmation instead of window.confirm.
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { vi as dict } from "@/i18n/vi";
import type { Quote, QuoteLine } from "@/lib/types";
import type { QuoteWithLines } from "../lib/types";

const saveMock = vi.fn();
const sendMock = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("../server/actions-edit", () => ({ saveQuoteDraftAction: (...a: unknown[]) => saveMock(...a) }));
vi.mock("../server/actions-send", () => ({ sendQuoteAction: (...a: unknown[]) => sendMock(...a) }));

import { QuoteEditor } from "./quote-editor";

const QID = "22222222-2222-4222-8222-222222222222";
const line: QuoteLine = {
  id: "33333333-3333-4333-8333-333333333333", quote_id: QID, sort_order: 0,
  description: "Băng keo 48mm", unit: "cuộn", quantity: 100, unit_price: 10_000, line_total: 1_000_000,
};
function quote(over: Partial<Quote> = {}): QuoteWithLines {
  return {
    id: QID, lead_id: "11111111-1111-4111-8111-111111111111", version: 1, status: "draft", currency: "VND",
    subtotal: 1_000_000, vat_percent: 8, vat_amount: 80_000, total: 1_080_000,
    valid_until: null, notes: null, pdf_path: null, created_by: null, sent_at: null,
    responded_at: null, customer_response_note: null,
    created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z",
    ...over, lines: [line],
  };
}

afterEach(cleanup);
beforeEach(() => {
  saveMock.mockReset();
  sendMock.mockReset();
});

describe("QuoteEditor", () => {
  it("shows a success status after saving a draft, kept across the refreshed props", async () => {
    const saved = quote({ updated_at: "2026-01-01T00:05:00Z" });
    saveMock.mockResolvedValue({ ok: true, data: saved });
    const { rerender } = render(<QuoteEditor initial={quote()} />);
    fireEvent.change(screen.getByLabelText(dict.quotes.unitPrice), { target: { value: "12000" } });
    await act(async () => fireEvent.click(screen.getByRole("button", { name: dict.quotes.saveDraft })));
    expect(screen.getByRole("status").textContent).toBe(dict.common.savedSuccess);
    rerender(<QuoteEditor initial={saved} />);
    expect(screen.getByRole("status").textContent).toBe(dict.common.savedSuccess);
  });

  it("asks for confirmation inline before sending", async () => {
    sendMock.mockResolvedValue({ ok: true, data: { sentAt: "x", linkExpiresAt: "y" } });
    const confirmSpy = vi.spyOn(window, "confirm");
    render(<QuoteEditor initial={quote()} />);
    fireEvent.click(screen.getByRole("button", { name: dict.quotes.send }));
    expect(sendMock).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: dict.common.cancel }));
    expect(sendMock).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: dict.quotes.send }));
    await act(async () => fireEvent.click(screen.getByRole("button", { name: dict.common.confirm })));
    expect(sendMock).toHaveBeenCalledWith(QID);
    expect(confirmSpy).not.toHaveBeenCalled();
    expect(screen.getByRole("status").textContent).toBe(dict.quotes.sentSuccess);
  });
});
