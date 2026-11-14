import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { DesignProvider } from "./DesignProvider";
import { useDesignState } from "./hooks";
import { PatternPicker } from "./PatternPicker";

afterEach(cleanup);

function Probe() {
  const [s, dispatch] = useDesignState();
  return (
    <>
      <output data-testid="pattern">{s.pattern}</output>
      <output data-testid="border">{`${s.border.style} ${s.border.widthMm}`}</output>
      <button type="button" onClick={() => dispatch({ type: "setWidth", widthMm: 36 })}>narrow</button>
    </>
  );
}

function setup() {
  render(
    <DesignProvider>
      <PatternPicker />
      <Probe />
    </DesignProvider>,
  );
}

const radio = (name: string) => screen.getByRole("radio", { name });
const patternGroup = () => screen.getByRole("radiogroup", { name: "Kiểu lặp mẫu in" });

describe("<PatternPicker>", () => {
  it("offers every pattern with straight selected first", () => {
    setup();
    const radios = screen.getAllByRole("radio").filter((r) => r.hasAttribute("data-pattern"));
    expect(radios.map((r) => r.getAttribute("data-pattern"))).toEqual(["straight", "flip", "blocks", "brick", "grid", "diagonal"]);
    expect(radio("Lặp thẳng")).toHaveAttribute("aria-checked", "true");
    expect(screen.getByTestId("pattern")).toHaveTextContent("straight");
  });

  it("switches pattern and explains all-over patterns", () => {
    setup();
    fireEvent.click(radio("Lưới so le"));
    expect(screen.getByTestId("pattern")).toHaveTextContent("brick");
    expect(patternGroup()).toHaveAccessibleDescription(/nửa cỡ/);
    fireEvent.click(radio("So le màu"));
    expect(screen.getByTestId("pattern")).toHaveTextContent("blocks");
    expect(patternGroup()).not.toHaveAccessibleDescription(/nửa cỡ/);
  });

  it("locks patterns on tapes under 48mm", () => {
    setup();
    fireEvent.click(radio("Chéo so le"));
    fireEvent.click(screen.getByRole("button", { name: "narrow" }));
    expect(screen.getByTestId("pattern")).toHaveTextContent("straight");
    expect(radio("Chéo so le")).toBeDisabled();
    expect(radio("Lặp thẳng")).toBeEnabled();
    expect(patternGroup()).toHaveAccessibleDescription(/Khổ dưới 48mm/);
  });

  it("sets border lines from 3mm with a thickness slider", () => {
    setup();
    expect(screen.queryByLabelText("Độ dày viền")).toBeNull();
    fireEvent.click(radio("Sọc chéo"));
    expect(screen.getByTestId("border")).toHaveTextContent("stripes 3");
    expect(screen.getAllByLabelText("Độ dày viền").length).toBeGreaterThan(0);
    fireEvent.click(radio("Không viền"));
    expect(screen.getByTestId("border")).toHaveTextContent("none");
  });

  it("keeps the repeat gap slider", () => {
    setup();
    expect(screen.getAllByLabelText("Khoảng cách lặp mẫu").length).toBeGreaterThan(0);
  });
});
