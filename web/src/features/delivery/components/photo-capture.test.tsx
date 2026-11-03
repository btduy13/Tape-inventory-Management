import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { deliveryCopy as t } from "../lib/copy";

vi.mock("../lib/client-image", () => ({
  captureVideoFrame: vi.fn(),
  prepareFile: vi.fn(async (file: File) => ({ blob: file, width: 1280, height: 960 })),
}));

const { PhotoCapture } = await import("./photo-capture");
const TOKEN = "c".repeat(43);

function pickFile() {
  const input = document.querySelector('input[type="file"]') as HTMLInputElement;
  expect(input.getAttribute("capture")).toBe("environment");
  expect(input.accept).toBe("image/*");
  fireEvent.change(input, { target: { files: [new File(["x"], "a.jpg", { type: "image/jpeg" })] } });
}

describe("PhotoCapture", () => {
  afterEach(cleanup);

  it("falls back to the native camera input when getUserMedia is missing", async () => {
    render(<PhotoCapture token={TOKEN} />);
    fireEvent.click(screen.getByRole("button", { name: t.openCamera }));
    expect(await screen.findByText(t.cameraUnavailable)).toBeInTheDocument();
    expect(screen.getByText(t.pickFile)).toBeInTheDocument();
  });

  it("previews, then posts the photo and shows the delivered state", async () => {
    URL.createObjectURL = vi.fn(() => "blob:preview");
    URL.revokeObjectURL = vi.fn();
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ ok: true, confirmedAt: "2026-11-03T03:05:00Z" }), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);
    try {
      render(<PhotoCapture token={TOKEN} />);
      pickFile();
      expect(await screen.findByAltText(t.previewAlt)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: t.retake })).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: t.confirm }));
      expect(await screen.findByText(t.success)).toBeInTheDocument();
      const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
      expect(url).toBe(`/api/giao/${TOKEN}`);
      expect(init.method).toBe("POST");
      expect(init.credentials).toBe("omit");
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("shows the server's reason and keeps the photo for a retake", async () => {
    URL.createObjectURL = vi.fn(() => "blob:preview");
    URL.revokeObjectURL = vi.fn();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ ok: false, error: "blank" }), { status: 422 })),
    );
    try {
      render(<PhotoCapture token={TOKEN} />);
      pickFile();
      fireEvent.click(await screen.findByRole("button", { name: t.confirm }));
      expect(await screen.findByRole("alert")).toHaveTextContent(t.errors.blank);
      await waitFor(() => expect(screen.getByRole("button", { name: t.retake })).toBeEnabled());
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("stops offering capture once the note is locked elsewhere", async () => {
    URL.createObjectURL = vi.fn(() => "blob:preview");
    URL.revokeObjectURL = vi.fn();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ ok: false, error: "already_confirmed" }), { status: 409 })),
    );
    try {
      render(<PhotoCapture token={TOKEN} />);
      pickFile();
      fireEvent.click(await screen.findByRole("button", { name: t.confirm }));
      expect(await screen.findByRole("alert")).toHaveTextContent(t.errors.already_confirmed);
      expect(screen.queryByRole("button", { name: t.confirm })).toBeNull();
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
