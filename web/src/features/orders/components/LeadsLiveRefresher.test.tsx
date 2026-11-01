// Regression (QC-12): /admin status counts subscribe to all lead changes (no leadId filter).
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const hook = vi.fn();
vi.mock("./useLeadRealtime", () => ({ useLeadRealtime: (o: unknown) => hook(o) }));

import { LeadsLiveRefresher } from "./LeadsLiveRefresher";

afterEach(cleanup);

describe("LeadsLiveRefresher", () => {
  it("subscribes without a lead filter and renders nothing", () => {
    const { container } = render(<LeadsLiveRefresher />);
    expect(hook).toHaveBeenCalledWith({});
    expect(container.innerHTML).toBe("");
  });
});
