"use client";
// Short confirmation after an action ("Đã lưu."), bottom of the screen, auto-hides.
// Persistent results (validation errors) belong in InlineStatus next to the form instead.
import { useEffect, useState } from "react";
import { Icon } from "./Icon";

export type ToastMessage = {
  /** Change it to show the toast again (e.g. Date.now() or an action counter). */
  id: number | string;
  message: string;
  tone?: "success" | "error";
};

export function Toast({ toast, durationMs = 4000 }: { toast: ToastMessage | null; durationMs?: number }) {
  const [shown, setShown] = useState<ToastMessage | null>(null);
  const [prevId, setPrevId] = useState<ToastMessage["id"] | null>(null);

  // Derive "show" from a new toast id during render (no effect-driven setState).
  if ((toast?.id ?? null) !== prevId) {
    setPrevId(toast?.id ?? null);
    setShown(toast);
  }

  useEffect(() => {
    if (!shown) return;
    const id = setTimeout(() => setShown(null), durationMs);
    return () => clearTimeout(id);
  }, [shown, durationMs]);

  const error = shown?.tone === "error";
  return (
    <div aria-live={error ? "assertive" : "polite"} className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-4">
      {shown && (
        <p className={`pt-toast pointer-events-auto flex min-h-11 max-w-md items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white ${error ? "bg-vt-red-deep" : "bg-vt-navy-deep"}`}>
          <Icon name={error ? "alert" : "check"} className="size-4" />
          {shown.message}
        </p>
      )}
    </div>
  );
}
