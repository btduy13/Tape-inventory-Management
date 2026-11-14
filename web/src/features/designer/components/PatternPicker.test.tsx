import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { DesignProvider } from "./DesignProvider";
import { useDesignState } from "./hooks";
import { PatternPicker } from "./PatternPicker";

afterEach(cleanup);

function Probe() {
  const [s] = useDesignState();
  return <output data-testid="pattern">{s.pattern}</output>;
}

function setup() {
  render(
    <DesignProvider>
      <PatternPicker />
      <Probe />
    </DesignProvider>,
  );
}

describe("<PatternPicker>", () => {
  it("offers every pattern with straight selected first", () => {
    setup();
    const radios = screen.getAllByRole("radio");
    expect(radios.map((r) => r.getAttribute("data-pattern"))).toEqual(["straight", "flip", "stagger", "twoRows", "diagonal"]);
    expect(screen.getByRole("radio", { name: "Lặp thẳng" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByTestId("pattern")).toHaveTextContent("straight");
  });

  it("switches pattern and explains the two-row size", () => {
    setup();
    fireEvent.click(screen.getByRole("radio", { name: "So le 2 hàng" }));
    expect(screen.getByTestId("pattern")).toHaveTextContent("stagger");
    expect(screen.getByRole("radio", { name: "So le 2 hàng" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("radiogroup")).toHaveAccessibleDescription(/nhỏ đi một nửa/);
    fireEvent.click(screen.getByRole("radio", { name: "Xoay xen kẽ 0°/180°" }));
    expect(screen.getByTestId("pattern")).toHaveTextContent("flip");
    expect(screen.getByRole("radiogroup")).not.toHaveAccessibleDescription(/nhỏ đi một nửa/);
  });

  it("keeps the repeat gap slider", () => {
    setup();
    expect(screen.getAllByLabelText("Khoảng cách lặp mẫu").length).toBeGreaterThan(0);
  });
});
