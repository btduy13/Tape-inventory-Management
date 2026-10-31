import type { AdminActionState } from "../lib/schemas";

export function ActionMessage({ state }: { state: AdminActionState }) {
  if (state.status === "idle" || !state.message) return null;
  return (
    <p role={state.status === "error" ? "alert" : "status"} className={`text-sm ${state.status === "error" ? "text-red-700" : "text-green-700"}`}>
      {state.message}
    </p>
  );
}

export const field = "rounded-md border border-neutral-300 px-2 py-1.5 text-sm focus:border-amber-600 focus:outline-none";
export const primaryButton =
  "rounded-md bg-amber-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-amber-800 disabled:opacity-60";
export const secondaryButton =
  "rounded-md border border-neutral-300 px-3 py-1.5 text-sm text-neutral-700 hover:bg-neutral-100 disabled:opacity-60";
