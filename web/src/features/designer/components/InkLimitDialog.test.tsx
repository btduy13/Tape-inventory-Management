import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { DesignProvider } from "./DesignProvider";
import { DesignerPanel } from "./DesignerPanel";
import { zaloHref, type DesignerContact } from "./InkLimitDialog";

vi.mock("./TapeCanvas2D", () => ({ TapeCanvas2D: () => <div data-testid="canvas2d" /> }));
vi.mock("./DesignMockupBridge", () => ({ DesignMockupBridge: () => <div data-testid="mockup3d" /> }));
vi.mock("../lib/logo-load", () => ({
  loadLogoFile: vi.fn(async (file: File) => ({ ok: true, logo: { file, kind: "png", url: `blob:${file.name}`, width: 40, height: 20 } })),
}));
// File name decides the analysed inks: "photo" = 26 colours, "many" = 5, otherwise red + navy.
// 26 well-separated colours (3 levels per channel), so the analyser's near-colour merge keeps them.
const PHOTO_INKS = Array.from({ length: 26 }, (_, i) =>
  "#" + [i % 3, Math.floor(i / 3) % 3, Math.floor(i / 9)].map((v) => ["00", "80", "ff"][v]).join(""),
);
vi.mock("../lib/logo-colors-dom", () => ({
  analyzeLogoUrl: vi.fn(async (url: string) => ({
    backgroundRemoved: false,
    inks: (url.includes("photo") ? PHOTO_INKS : url.includes("many") ? ["#ff0000", "#00ff00", "#0000ff", "#ffff00", "#ff00ff"] : ["#c8102e", "#0a1466"]).map((hex) => ({ hex, coverage: 0.03 })),
  })),
}));

afterEach(() => {
  cleanup();
  window.location.hash = "";
});

function setup(contact?: DesignerContact) {
  render(
    <DesignProvider>
      <DesignerPanel contact={contact} quote={<form aria-label="quote-form" />} />
    </DesignProvider>,
  );
}
const upload = (name: string) =>
  fireEvent.change(screen.getByTestId("logo-input"), { target: { files: [new File(["x"], name, { type: "image/png" })] } });
const head = (id: string) => document.getElementById(`step-${id}-head`)!;

describe("ink limit (max 3 print inks)", () => {
  it("2-colour logo + text in the logo red: 2 inks, no dialog", async () => {
    setup();
    fireEvent.click(head("content"));
    fireEvent.change(screen.getByLabelText("Nội dung in"), { target: { value: "ACME" } });
    upload("two.png");
    await waitFor(() => expect(screen.getAllByText("Số màu in: 2/3").length).toBeGreaterThan(0));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("many-colour logo opens an accessible dialog; Esc closes and returns focus", async () => {
    setup();
    fireEvent.click(head("content"));
    const input = screen.getByLabelText("Nội dung in");
    input.focus();
    upload("many.png");
    const dialog = await screen.findByRole("dialog", { name: "Thiết kế vượt quá 3 màu in" });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveTextContent("Logo của bạn có 5 màu");
    await waitFor(() => expect(dialog.contains(document.activeElement)).toBe(true));
    fireEvent.keyDown(dialog, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(document.activeElement).toBe(input);
    // Flag stays visible (not blocked): counter + colours step header.
    expect(head("colors")).toHaveTextContent("5 màu in, cần tư vấn");
  });

  it("'In một màu' switches the logo to one ink and closes", async () => {
    setup();
    upload("many.png");
    fireEvent.click(await screen.findByRole("button", { name: "In một màu" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    fireEvent.click(head("content"));
    expect(screen.getByRole("radio", { name: "In một màu" })).toHaveAttribute("aria-checked", "true");
  });

  it("'Liên hệ tư vấn' without a phone opens the quote step with the flag", async () => {
    setup();
    upload("many.png");
    fireEvent.click(await screen.findByRole("button", { name: "Liên hệ tư vấn" }));
    expect(head("quote")).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("note")).toHaveTextContent("5 màu in (tối đa 3)");
  });

  it("with a phone: call + Zalo links; Tab is trapped", async () => {
    setup({ phone: "0901 234 567", phoneHref: "tel:0901234567" });
    upload("many.png");
    const dialog = await screen.findByRole("dialog");
    expect(screen.getByRole("link", { name: "Gọi tư vấn 0901 234 567" })).toHaveAttribute("href", "tel:0901234567");
    expect(screen.getByRole("link", { name: "Nhắn Zalo" })).toHaveAttribute("href", "https://zalo.me/0901234567");
    const last = screen.getByRole("button", { name: "Để sau" });
    last.focus();
    fireEvent.keyDown(dialog, { key: "Tab" });
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Đóng" }));
  });

  it("photo / gradient logo: counts above 6 read 'hơn 6', not the raw number", async () => {
    setup();
    upload("photo.png");
    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveTextContent("Logo của bạn có hơn 6 màu");
    expect(dialog).not.toHaveTextContent("26");
    fireEvent.keyDown(dialog, { key: "Escape" });
    const counter = screen.getAllByTestId("ink-counter")[0];
    expect(counter).toHaveTextContent("Số màu in: hơn 6 (tối đa 3)");
    expect(counter).toHaveTextContent("Logo có hơn 6 màu");
    expect(counter.querySelectorAll("svg")).toHaveLength(6);
    expect(head("colors")).toHaveTextContent("hơn 6 màu in, cần tư vấn");
  });

  it("zaloHref accepts VN numbers only", () => {
    expect(zaloHref("tel:+84901234567")).toBe("https://zalo.me/0901234567");
    expect(zaloHref("tel:+14155550100")).toBeNull();
    expect(zaloHref(null)).toBeNull();
  });
});
