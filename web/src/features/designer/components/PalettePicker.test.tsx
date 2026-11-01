import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { DesignProvider } from "./DesignProvider";
import { PalettePicker } from "./PalettePicker";

describe("<PalettePicker>", () => {
  it("counts colours and disables the background colour for text", () => {
    render(
      <DesignProvider>
        <PalettePicker />
      </DesignProvider>,
    );
    expect(screen.getByText("Đang dùng 2/3 màu in")).toBeInTheDocument();
    // initial background #d9c3a0 (Kraft) is disabled in the text and accent swatch rows
    expect(screen.getByRole("button", { name: "Kraft (nâu nhạt)" })).not.toBeDisabled();
    const taken = screen.getAllByRole("button", { name: "Kraft (nâu nhạt) - đã dùng cho màu khác" });
    expect(taken).toHaveLength(2);
    for (const b of taken) expect(b).toBeDisabled();

    // Accent unset: shows the text colour fallback, not black (QC-08).
    expect(screen.getByText("(mặc định: theo màu chữ)")).toBeInTheDocument();
    const pickers = document.querySelectorAll<HTMLInputElement>('input[type="color"]');
    expect(pickers[2].value).toBe("#c8102e");

    fireEvent.click(screen.getAllByRole("button", { name: "Xanh dương" })[2]);
    expect(screen.getByText("Đang dùng 3/3 màu in")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Không dùng màu thứ 3" }));
    expect(screen.getByText("Đang dùng 2/3 màu in")).toBeInTheDocument();
  });
});
