// Regressions: UI-2 (pagination clamp), UI-4 (stepper keyboard scroll), UI-5 (step SR text), UI-9 (404 / error).
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi as mock } from "vitest";
import { vi } from "@/i18n/vi";
import { defineListSpec, parseListParams } from "../lib/list-params";
import { Pagination } from "./Pagination";
import { RouteError } from "./RouteError";
import { NotFoundState } from "./States";
import { ProductionStepper, WorkflowStepper } from "./WorkflowStepper";

afterEach(cleanup);

describe("WorkflowStepper", () => {
  it("lets keyboard users focus the scrollable strip", () => {
    render(<WorkflowStepper status="consulting" role="staff" />);
    expect(screen.getByRole("list", { name: vi.portalUi.workflow }).getAttribute("tabindex")).toBe("0");
  });

  it("labels passed steps as done, not as a finished order", () => {
    render(<WorkflowStepper status="consulting" role="staff" />);
    const items = screen.getAllByRole("listitem");
    expect(items[0]!.textContent).toContain(vi.portalUi.stepPassed);
    expect(items[0]!.textContent).not.toContain(vi.portalUi.finished);
  });

  it("production strip is focusable too", () => {
    render(<ProductionStepper step="dang_san_xuat" />);
    expect(screen.getByRole("list", { name: vi.portalUi.productionFlow }).getAttribute("tabindex")).toBe("0");
  });
});

describe("Pagination", () => {
  const spec = defineListSpec({ sort: { keys: { a: { column: "a" } }, default: { key: "a", dir: "asc" } }, pageSizes: [2] });
  it("shows the clamped page for an out-of-range ?page", () => {
    render(<Pagination basePath="/x" spec={spec} state={parseListParams(spec, { page: "99" })} total={3} />);
    expect(screen.getByText("Trang 2/2")).toBeTruthy();
  });
});

describe("portal route states", () => {
  it("404 links to the role home, uses no inline styles", () => {
    const { container } = render(<NotFoundState homeHref="/admin" />);
    expect(screen.getByRole("link", { name: vi.portalUi.backHome }).getAttribute("href")).toBe("/admin");
    expect(container.querySelectorAll("[style]").length).toBe(0);
  });

  it("error boundary retries via reset", () => {
    const reset = mock.fn();
    render(<RouteError reset={reset} />);
    fireEvent.click(screen.getByRole("button", { name: vi.portalUi.retry }));
    expect(reset).toHaveBeenCalledOnce();
  });
});
