import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useEffect } from "react";
import { LeadForm } from "./LeadForm";
import { DESIGN } from "../testing/fixtures";

// Stub the Cloudflare widget: immediately yields a token.
vi.mock("./TurnstileWidget", () => ({
  TurnstileWidget: function Stub({ onToken }: { onToken: (t: string) => void }) {
    useEffect(() => onToken("tok"), [onToken]);
    return null;
  },
}));

function fill(label: RegExp, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

describe("LeadForm", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("shows field errors client side without calling the API", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    render(<LeadForm getDesign={async () => ({ designJson: DESIGN })} turnstileSiteKey="k" />);
    fireEvent.click(screen.getByRole("button", { name: /Gửi yêu cầu báo giá/ }));
    expect(await screen.findAllByText("Vui lòng nhập thông tin này.")).not.toHaveLength(0);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("submits and shows the lead code", async () => {
    const fetchMock = vi.fn(async () => Response.json({ ok: true, code: "L2610-00009" }, { status: 201 }));
    vi.stubGlobal("fetch", fetchMock);
    render(<LeadForm getDesign={async () => ({ designJson: DESIGN })} turnstileSiteKey="k" />);
    fill(/Họ và tên/, "Nguyễn Văn A");
    fill(/Số điện thoại/, "0912345678");
    fill(/Số lượng/, "500");
    fireEvent.click(screen.getByRole("button", { name: /Gửi yêu cầu báo giá/ }));
    await waitFor(() => expect(screen.getByText(/L2610-00009/)).toBeInTheDocument());
    const body = (fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body as FormData;
    expect(body.get("turnstileToken")).toBe("tok");
    expect(body.get("quantity")).toBe("500");
  });

  it("hideHeading keeps the title for screen readers only", () => {
    render(<LeadForm getDesign={async () => ({ designJson: DESIGN })} turnstileSiteKey="k" hideHeading />);
    expect(screen.getByRole("heading", { name: "Yêu cầu báo giá" })).toHaveClass("sr-only");
    expect(screen.queryByText(/Để lại thông tin/)).not.toBeInTheDocument();
  });

  it("shows the server error message", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ ok: false, error: "rate_limited" }, { status: 429 })));
    render(<LeadForm getDesign={async () => ({ designJson: DESIGN })} turnstileSiteKey="k" />);
    fill(/Họ và tên/, "A");
    fill(/Số điện thoại/, "0912345678");
    fill(/Số lượng/, "5");
    fireEvent.click(screen.getByRole("button", { name: /Gửi yêu cầu báo giá/ }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/quá nhanh/);
  });
});
