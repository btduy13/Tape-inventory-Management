"use client";
import { useEffect, useRef } from "react";
import type { AdminActionState } from "../lib/schemas";

/** Calls `onSuccess(message)` once per new successful action state (useActionState result). */
export function useOnSuccess(state: AdminActionState, onSuccess: (message?: string) => void): void {
  const seen = useRef(state);
  useEffect(() => {
    if (state === seen.current) return;
    seen.current = state;
    if (state.status === "success") onSuccess(state.message);
  });
}

/** setToast updater: a new id per message so the same text shows again (no Date.now in render paths). */
export const nextToast = (message: string) => (prev: { id: number | string } | null) => ({
  id: (typeof prev?.id === "number" ? prev.id : 0) + 1,
  message,
});
