import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { DEFAULT_PRESETS } from "../lib/presets";
import { DesignProvider } from "./DesignProvider";
import { PalettePicker } from "./PalettePicker";

describe("<PalettePicker>", () => {
  it("counts colours and disables the background colour for text", () => {
    render(
      <DesignProvider presets={[...DEFAULT_PRESETS]}>
        <PalettePicker />
      </DesignProvider>,
    );
    expect(screen.getByText("Đang dùng 2/3 màu in")).toBeInTheDocument();
    // initial background #d9c3a0 is disabled in the text and accent swatch rows
    const bgSwatches = screen.getAllByRole("button", { name: "#d9c3a0" });
    expect(bgSwatches[0]).not.toBeDisabled();
    expect(bgSwatches[1]).toBeDisabled();
    expect(bgSwatches[2]).toBeDisabled();

    fireEvent.click(screen.getAllByRole("button", { name: "#0033a0" })[2]);
    expect(screen.getByText("Đang dùng 3/3 màu in")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Không dùng màu thứ 3" }));
    expect(screen.getByText("Đang dùng 2/3 màu in")).toBeInTheDocument();
  });
});
