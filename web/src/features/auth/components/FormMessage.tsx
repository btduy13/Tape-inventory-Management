import type { AuthActionState } from "../lib/action-state";

export function FormMessage({ state }: { state: AuthActionState }) {
  if (state.status === "idle" || !state.message) return null;
  const tone =
    state.status === "error"
      ? "border-red-200 bg-red-50 text-red-800"
      : "border-green-200 bg-green-50 text-green-800";
  return (
    <p role={state.status === "error" ? "alert" : "status"} className={`rounded-md border px-3 py-2 text-sm ${tone}`}>
      {state.message}
    </p>
  );
}

export const inputClass =
  "w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-600/30";
export const buttonClass =
  "w-full rounded-md bg-amber-700 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-800 disabled:opacity-60";
