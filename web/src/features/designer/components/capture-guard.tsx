"use client";
// Deterrents against copying a design out of the preview (2D strip + 3D roll). A browser cannot
// block screenshots outright (OS tools, a phone camera), so this only raises the bar:
//   - previews hide behind a blur while the page is not focused / visible (snipping tools take
//     focus), and for a moment after PrintScreen or the macOS / Windows capture shortcuts;
//   - PrintScreen also overwrites the clipboard when the browser allows it;
//   - Ctrl/Cmd+S (save page) and Ctrl/Cmd+P (print / PDF) are swallowed, and previews are
//     hidden from print;
//   - right-click, drag and long-press save are disabled on the previews (CaptureZone);
//   - a brand watermark is tiled over the 2D strip (the 3D viewer has its own).
// The quote form still uploads the clean preview PNG to staff; customers get no download.
import { useEffect, useState, type ReactNode } from "react";
import { getDictionary } from "@/i18n";

/** How long previews stay hidden after a capture shortcut. */
const CAPTURE_HIDE_MS = 2500;

/** True for PrintScreen and the OS screenshot shortcuts (Cmd+Shift+3/4/5, Win+Shift+S). */
export function isCaptureKey(e: Pick<KeyboardEvent, "key" | "code" | "metaKey" | "shiftKey" | "ctrlKey">): boolean {
  if (e.key === "PrintScreen" || e.code === "PrintScreen") return true;
  if (e.metaKey && e.shiftKey && ["3", "4", "5", "s", "S"].includes(e.key)) return true;
  // Some keyboards report Cmd+Shift+3/4/5 by code only.
  return e.metaKey && e.shiftKey && ["Digit3", "Digit4", "Digit5", "KeyS"].includes(e.code);
}

/** True for Ctrl/Cmd+S (save page) and Ctrl/Cmd+P (print / save as PDF). */
export function isSaveOrPrintKey(e: Pick<KeyboardEvent, "key" | "metaKey" | "ctrlKey" | "altKey">): boolean {
  return (e.ctrlKey || e.metaKey) && !e.altKey && ["s", "S", "p", "P"].includes(e.key);
}

/** Whether previews should be hidden right now. Installs the focus / key handlers while mounted.
 *  Event driven on purpose: previews start visible and only hide after the page actually loses
 *  focus, so an in-app webview that never reports focus cannot leave them hidden; any tap or
 *  click on the page brings them back. */
export function useCaptureGuard(): boolean {
  const [away, setAway] = useState(false);
  const [captured, setCaptured] = useState(false);

  useEffect(() => {
    const leave = () => setAway(true);
    const back = () => setAway(false);
    const onVisibility = () => setAway(document.visibilityState === "hidden");
    window.addEventListener("blur", leave);
    window.addEventListener("focus", back);
    window.addEventListener("pointerdown", back, true);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("blur", leave);
      window.removeEventListener("focus", back);
      window.removeEventListener("pointerdown", back, true);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const flash = () => {
      setCaptured(true);
      clearTimeout(timer);
      timer = setTimeout(() => setCaptured(false), CAPTURE_HIDE_MS);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (isSaveOrPrintKey(e)) {
        e.preventDefault();
        return;
      }
      if (isCaptureKey(e)) flash();
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key !== "PrintScreen" && e.code !== "PrintScreen") return;
      flash();
      // Overwrite the screenshot Windows just put on the clipboard (ignored when not allowed).
      navigator.clipboard?.writeText("").catch(() => {});
    };
    window.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("keyup", onKeyUp, true);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener("keyup", onKeyUp, true);
    };
  }, []);

  return away || captured;
}

const block = (e: { preventDefault: () => void }) => e.preventDefault();

/**
 * Wraps a preview: no context menu (Save image as), no drag-out, no iOS long-press callout,
 * hidden from print, and covered by a blur shield while `hidden`.
 */
export function CaptureZone({ hidden, children, className = "" }: { hidden: boolean; children: ReactNode; className?: string }) {
  const t = getDictionary().designer;
  return (
    <div
      onContextMenu={block}
      onDragStart={block}
      data-capture-zone=""
      className={`relative select-none [-webkit-touch-callout:none] print:hidden ${className}`}
    >
      {children}
      {hidden && (
        <div
          role="status"
          data-capture-shield=""
          className="absolute inset-0 z-30 flex items-center justify-center rounded-md bg-white/60 px-3 text-center text-xs font-medium text-slate-700 backdrop-blur-xl sm:text-sm"
        >
          {t.previewHidden}
        </div>
      )}
    </div>
  );
}
