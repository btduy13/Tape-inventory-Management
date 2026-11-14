import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { CaptureZone, isCaptureKey, isSaveOrPrintKey, useCaptureGuard } from "./capture-guard";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

const key = (over: Partial<KeyboardEvent>) => ({ key: "", code: "", metaKey: false, shiftKey: false, ctrlKey: false, altKey: false, ...over });

describe("capture keys", () => {
  it("detects PrintScreen and OS screenshot shortcuts", () => {
    expect(isCaptureKey(key({ key: "PrintScreen" }))).toBe(true);
    expect(isCaptureKey(key({ key: "4", metaKey: true, shiftKey: true }))).toBe(true);
    expect(isCaptureKey(key({ key: "S", metaKey: true, shiftKey: true }))).toBe(true);
    expect(isCaptureKey(key({ code: "Digit5", metaKey: true, shiftKey: true }))).toBe(true);
    expect(isCaptureKey(key({ key: "4", shiftKey: true }))).toBe(false);
    expect(isCaptureKey(key({ key: "a" }))).toBe(false);
  });
  it("detects save page and print", () => {
    expect(isSaveOrPrintKey(key({ key: "s", ctrlKey: true }))).toBe(true);
    expect(isSaveOrPrintKey(key({ key: "p", metaKey: true }))).toBe(true);
    expect(isSaveOrPrintKey(key({ key: "s" }))).toBe(false);
    expect(isSaveOrPrintKey(key({ key: "c", ctrlKey: true }))).toBe(false);
  });
});

function Guarded() {
  const hidden = useCaptureGuard();
  return (
    <CaptureZone hidden={hidden}>
      <canvas aria-label="preview" />
    </CaptureZone>
  );
}

describe("<CaptureZone> + useCaptureGuard", () => {
  it("blocks the context menu and drag on the preview", () => {
    render(<Guarded />);
    const img = screen.getByLabelText("preview");
    expect(fireEvent.contextMenu(img)).toBe(false); // default prevented
    expect(fireEvent.dragStart(img)).toBe(false);
  });

  it("shields the preview after the page loses focus, until it is back or tapped", () => {
    render(<Guarded />);
    expect(screen.queryByRole("status")).toBeNull();
    act(() => {
      window.dispatchEvent(new Event("blur"));
    });
    expect(screen.getByRole("status")).toHaveTextContent("Bản xem trước tạm ẩn");
    act(() => {
      window.dispatchEvent(new Event("focus"));
    });
    expect(screen.queryByRole("status")).toBeNull();
    act(() => {
      window.dispatchEvent(new Event("blur"));
    });
    fireEvent.pointerDown(document.body);
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("shields for a moment after PrintScreen and swallows Ctrl+S / Ctrl+P", () => {
    vi.useFakeTimers();
    render(<Guarded />);
    act(() => {
      fireEvent.keyUp(window, { key: "PrintScreen", code: "PrintScreen" });
    });
    expect(screen.getByRole("status")).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(screen.queryByRole("status")).toBeNull();
    expect(fireEvent.keyDown(window, { key: "s", ctrlKey: true })).toBe(false);
    expect(fireEvent.keyDown(window, { key: "p", metaKey: true })).toBe(false);
    expect(fireEvent.keyDown(window, { key: "c", ctrlKey: true })).toBe(true);
  });
});
