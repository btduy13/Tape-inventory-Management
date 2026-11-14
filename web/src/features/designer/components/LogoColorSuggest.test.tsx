import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useEffect } from "react";
import type { DesignAction } from "../lib/state";
import { DesignProvider } from "./DesignProvider";
import { useDesignState } from "./hooks";
import { LogoColorSuggest } from "./LogoColorSuggest";

afterEach(cleanup);

const LOGO = { file: new File(["x"], "a.png"), kind: "png" as const, url: "blob:l", width: 10, height: 10 };

function Setup({ actions }: { actions: DesignAction[] }) {
  const [s, dispatch] = useDesignState();
  useEffect(() => {
    for (const a of actions) dispatch(a);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return <output data-testid="text-color">{s.textColor}</output>;
}

function setup(actions: DesignAction[]) {
  render(
    <DesignProvider>
      <Setup actions={actions} />
      <LogoColorSuggest />
    </DesignProvider>,
  );
}

const withLogo = (inks: string[]): DesignAction[] => [
  { type: "setText", text: "ACME" },
  { type: "setLogo", logo: LOGO },
  { type: "setLogoInks", url: "blob:l", inks: inks.map((hex) => ({ hex, coverage: 0.5 })) },
];

describe("<LogoColorSuggest>", () => {
  it("offers the logo inks for the text and applies one in a tap", () => {
    setup([...withLogo(["#0a1466", "#007a33"]), { type: "setColor", role: "textColor", color: "#000000" }]);
    fireEvent.click(screen.getByRole("button", { name: "Đổi màu chữ thành #0a1466" }));
    expect(screen.getByTestId("text-color")).toHaveTextContent("#0a1466");
    // Text now uses a logo ink: nothing left to suggest.
    expect(screen.queryByTestId("logo-color-suggest")).toBeNull();
  });

  it("stays hidden without text, without analysed inks, or when the text already matches", () => {
    setup([{ type: "setLogo", logo: LOGO }]);
    expect(screen.queryByTestId("logo-color-suggest")).toBeNull();
    cleanup();
    setup(withLogo(["#cf1f27"])); // default text colour is #cf1f27
    expect(screen.queryByTestId("logo-color-suggest")).toBeNull();
  });

  it("never offers the tape colour", () => {
    setup([...withLogo(["#d9c3a0"]), { type: "setColor", role: "textColor", color: "#000000" }]); // default tape #d9c3a0
    expect(screen.queryByTestId("logo-color-suggest")).toBeNull();
  });
});
