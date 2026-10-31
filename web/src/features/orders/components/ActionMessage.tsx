import type { OrdersActionState } from "../lib/action-state";

export function ActionMessage({ state }: { state: OrdersActionState }) {
  if (state.status === "idle" || !state.message) return null;
  const tone = state.status === "error" ? "text-red-700" : "text-green-700";
  return (
    <p role={state.status === "error" ? "alert" : "status"} className={`text-sm ${tone}`}>
      {state.message}
    </p>
  );
}

export const fieldClass =
  "rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-600/30";
export const primaryButtonClass =
  "self-start rounded-md bg-amber-700 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-800 disabled:opacity-60";
