// Regression (QC-09): body is a flex column and <main> has mx-auto, so without w-full/min-w-0
// it sized to the 560px table and the page scrolled sideways on phones.
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("../server/public-quote", () => ({
  loadPublicQuote: async () => ({
    access: "used",
    quote: {
      code: "L-1", customerName: "A", version: 1, validUntil: null, notes: null, status: "accepted",
      lines: [], subtotal: 0, vatPercent: 8, vatAmount: 0, total: 0,
    },
  }),
}));
vi.mock("./respond-form", () => ({ RespondForm: () => null }));

import { PublicQuotePage } from "./public-quote-page";

afterEach(cleanup);

describe("PublicQuotePage layout", () => {
  it("main is width-capped and can shrink below the table width", async () => {
    const { container } = render(await PublicQuotePage({ token: "t".repeat(43) }));
    const cls = container.querySelector("main")?.className ?? "";
    expect(cls).toContain("w-full");
    expect(cls).toContain("min-w-0");
  });
});
