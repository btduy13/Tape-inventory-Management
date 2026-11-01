import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { DesignProvider } from "./DesignProvider";
import { DesignerPanel } from "./DesignerPanel";

// Canvas / WebGL are out of scope for jsdom.
vi.mock("./TapeCanvas2D", () => ({ TapeCanvas2D: () => <div data-testid="canvas2d" /> }));
vi.mock("./DesignMockupBridge", () => ({ DesignMockupBridge: () => <div data-testid="mockup3d" /> }));

afterEach(() => {
  cleanup();
  window.location.hash = "";
});

function setup() {
  render(
    <DesignProvider>
      <DesignerPanel quote={<form aria-label="quote-form" />} />
    </DesignProvider>,
  );
}

const head = (id: string) => document.getElementById(`step-${id}-head`)!;
const panel = (id: string) => document.getElementById(`step-${id}-panel`)!;

describe("<DesignerPanel>", () => {
  it("renders stage, 3D and the four steps with spec opened first", () => {
    setup();
    expect(screen.getByTestId("canvas2d")).toBeInTheDocument();
    expect(screen.getByTestId("mockup3d")).toBeInTheDocument();
    expect(head("spec")).toHaveAttribute("aria-expanded", "true");
    for (const id of ["content", "colors", "quote"]) {
      expect(head(id)).toHaveAttribute("aria-expanded", "false");
      expect(panel(id)).not.toBeVisible();
    }
    // Collapsed headers show a live summary.
    expect(head("content")).toHaveTextContent("Chưa có chữ hoặc logo");
    expect(head("colors")).toHaveTextContent("Chưa có màu in");
  });

  it("opens one step at a time and 'Tiếp tục' moves to the next", () => {
    setup();
    fireEvent.click(head("content"));
    expect(head("content")).toHaveAttribute("aria-expanded", "true");
    expect(head("spec")).toHaveAttribute("aria-expanded", "false");
    expect(head("spec")).toHaveTextContent(/48 mm × 100 m/);

    fireEvent.change(screen.getByLabelText("Nội dung in"), { target: { value: "ACME" } });
    fireEvent.click(screen.getAllByRole("button", { name: /Tiếp tục/ }).find((b) => panel("content").contains(b))!);
    expect(head("colors")).toHaveAttribute("aria-expanded", "true");
    expect(head("content")).toHaveTextContent("“ACME”");
    expect(screen.getAllByText("Số màu in: 1/3")[0]).toBeInTheDocument();
  });

  it("shows an invalid length in the spec summary", () => {
    setup();
    fireEvent.change(screen.getByLabelText("Độ dài cuộn (m)"), { target: { value: "1" } });
    fireEvent.click(head("spec"));
    expect(head("spec")).toHaveTextContent("Độ dài chưa hợp lệ");
  });

  it("quote CTA opens step 4 with the summary and the quote slot", () => {
    setup();
    fireEvent.click(screen.getAllByRole("button", { name: "Nhận báo giá" })[0]);
    expect(head("quote")).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Thiết kế của bạn")).toBeVisible();
    expect(screen.getByRole("form", { name: "quote-form" })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Sửa màu in" }));
    expect(head("colors")).toHaveAttribute("aria-expanded", "true");
  });

  it("deep link #yeu-cau-bao-gia opens the quote step", () => {
    window.location.hash = "#yeu-cau-bao-gia";
    setup();
    expect(head("quote")).toHaveAttribute("aria-expanded", "true");
    expect(document.getElementById("yeu-cau-bao-gia")).toContainElement(head("quote"));
  });
});
