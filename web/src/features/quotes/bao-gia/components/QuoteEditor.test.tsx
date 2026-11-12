// The quote form shows every field of the app's quote form: "Kê khai" inputs, the read-only
// "Kết quả tính toán" (costs only with orders.money) and, for printed tape, Loại trục + the axis inputs.
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("../server/actions", () => ({ saveQuoteAction: vi.fn() }));

import { QuoteEditor } from "./QuoteEditor";

const header = { ten_hang: "", ten_khach_hang: "", sdt_khach_hang: "", dia_chi_khach_hang: "", customer_id: "" };
const type = (label: RegExp, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });
const valueOf = (label: string) => (screen.getByLabelText(label) as HTMLInputElement).value;

afterEach(cleanup);

describe("bao-gia QuoteEditor", () => {
  it("computes the printed-tape results and opens the axis inputs with Trục mới", () => {
    render(<QuoteEditor type="bang_keo_in" id={null} header={header} sizes={[]} money />);
    type(/^Quy cách \(m\)/, "100");
    type(/^Cuộn\/Cây/, "1");
    type(/^Đơn giá vốn/, "90.000");
    type(/^Số lượng/, "2");
    type(/^Đơn giá bán/, "150.000");
    expect(valueOf("Đơn giá gốc (đ)")).toMatch(/^100[.,]000$/);
    expect(valueOf("Thành tiền gốc (đ)")).toMatch(/^200[.,]000$/);
    expect(valueOf("Lợi nhuận ròng (đ)")).toMatch(/^100[.,]000$/);
    expect(screen.getByLabelText("Đơn giá gốc (đ)")).toHaveProperty("readOnly", true);

    expect(screen.queryByText("Trục đang nhập")).toBeNull();
    fireEvent.click(screen.getByRole("switch"));
    expect(screen.getByText("Trục đang nhập")).toBeTruthy();
    type(/^Số lượng trục/, "3");
    type(/^Giá bán trục/, "10.000");
    expect(valueOf("Thành tiền bán trục (đ)")).toMatch(/^30[.,]000$/);
  });

  it("hides costs and profit without orders.money", () => {
    render(<QuoteEditor type="bang_keo" id={null} header={header} sizes={[]} money={false} />);
    expect(screen.getByLabelText(/^Quy cách \(KG\)/)).toBeTruthy();
    expect(screen.getByLabelText("Công nợ khách (đ)")).toBeTruthy();
    expect(screen.queryByLabelText("Thành tiền gốc (đ)")).toBeNull();
    expect(screen.queryByLabelText("Lợi nhuận (đ)")).toBeNull();
  });
});
