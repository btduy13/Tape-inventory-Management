import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { DesignProvider } from "./DesignProvider";
import { PalettePicker } from "./PalettePicker";

describe("<PalettePicker>", () => {
  it("counts print inks and disables the background colour for text", () => {
    render(
      <DesignProvider>
        <PalettePicker />
      </DesignProvider>,
    );
    // Print inks: no text / logo yet, and the background (tape film) is not an ink.
    expect(screen.getByText("Số màu in: 0/3")).toBeInTheDocument();
    // initial background #d9c3a0 (Kraft) is disabled in the text swatch row only
    expect(screen.getByRole("button", { name: "Kraft (nâu nhạt)" })).not.toBeDisabled();
    const taken = screen.getAllByRole("button", { name: "Kraft (nâu nhạt) - đã dùng cho màu khác" });
    expect(taken).toHaveLength(1);
    expect(taken[0]).toBeDisabled();

    // No logo colour (accent) option: only background + text pickers.
    expect(document.querySelectorAll('input[type="color"]')).toHaveLength(2);
    expect(screen.queryByText("Màu logo (màu in thứ 3)")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Không dùng màu thứ 3" })).not.toBeInTheDocument();
  });
});
