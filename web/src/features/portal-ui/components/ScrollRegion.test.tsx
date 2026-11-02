// Regression: UI-4 (scroll regions holding wide tables must be keyboard-reachable).
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ScrollRegion } from "./ScrollRegion";

afterEach(cleanup);

describe("ScrollRegion", () => {
  it("is a named, focusable, scrolling region", () => {
    render(<ScrollRegion label="Bảng báo giá"><table><tbody><tr><td>x</td></tr></tbody></table></ScrollRegion>);
    const region = screen.getByRole("region", { name: "Bảng báo giá" });
    expect(region.getAttribute("tabindex")).toBe("0");
    expect(region.className).toContain("overflow-x-auto");
  });

  it("keeps caller classes", () => {
    render(<ScrollRegion label="Ma trận" className="relative -mx-4"><span /></ScrollRegion>);
    expect(screen.getByRole("region", { name: "Ma trận" }).className).toBe("overflow-x-auto relative -mx-4");
  });
});
