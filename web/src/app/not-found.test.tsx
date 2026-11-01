// Regression (QC-14): the 404 page must not use inline style attributes (blocked by CSP nonce).
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import NotFound from "./not-found";

afterEach(cleanup);

describe("not-found page", () => {
  it("renders without inline styles", () => {
    const { container } = render(<NotFound />);
    expect(container.querySelector("h1")).not.toBeNull();
    expect(container.querySelectorAll("[style]").length).toBe(0);
  });
});
