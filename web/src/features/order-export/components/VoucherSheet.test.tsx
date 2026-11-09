import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { COMPANY } from "../lib/copy";
import { calculateVoucherTotals, type ExportLine } from "../lib/voucher";
import { VoucherSheet } from "./VoucherSheet";

afterEach(cleanup);

const company = { ...COMPANY, hotline: "0903 003 882", representativePhone: "0903 003 882" };
const lines: ExportLine[] = [
  { id: "a", product: "Băng keo", specs: "48mm x 100m x 50mic", text_color: "Đỏ", bg_color: "Trong", unit: "cuộn", quantity: 100, price: 1000, vat: 8000, vatPercent: 8, total: 100000 },
];
const totals = calculateVoucherTotals(lines, 8000);

describe("VoucherSheet", () => {
  it("prints the order voucher: title, totals, words, company signature, no inline styles (CSP)", () => {
    const { container } = render(<VoucherSheet doc="don_dat_hang" company={company} customer="" address="Q1" date="09/11/2026" lines={lines} totals={totals} />);
    expect(screen.getByRole("heading", { name: "ĐƠN ĐẶT HÀNG" })).toBeInTheDocument();
    expect(screen.getByText("Còn lại cần thu")).toBeInTheDocument();
    expect(container.textContent).toContain("Một trăm nghìn đồng chẵn.");
    expect(container.textContent).toContain("ĐẠI DIỆN THƯƠNG MẠI");
    expect(container.textContent).toContain("Kính gửi:....");
    expect(container.querySelector("[style]")).toBeNull();
    expect(container.querySelector("[data-print-sheet]")).not.toBeNull();
  });

  it("delivery note signatures", () => {
    const { container } = render(<VoucherSheet doc="phieu_giao_hang" company={company} customer="A" address="" date="09/11/2026" lines={lines} totals={totals} />);
    expect(screen.getByRole("heading", { name: "PHIẾU GIAO HÀNG" })).toBeInTheDocument();
    expect(container.textContent).toContain("NGƯỜI GIAO HÀNG");
    expect(container.textContent).not.toContain("ĐẠI DIỆN THƯƠNG MẠI");
  });
});
