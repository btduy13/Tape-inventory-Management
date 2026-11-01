import { getDictionary } from "@/i18n";
import type { ProductionStep } from "@/lib/types";
import type { WorkshopActionState } from "../lib/schemas";
import { dueState, formatDueDate, type DueState } from "../lib/dates";

const t = getDictionary();

/** Big touch targets (>= 48px) for phones on the production floor. */
export const bigButton =
  "min-h-12 w-full rounded-lg bg-amber-700 px-4 py-3 text-base font-semibold text-white hover:bg-amber-800 disabled:opacity-60";
export const secondaryButton =
  "min-h-12 rounded-lg border border-neutral-300 px-4 py-3 text-base text-neutral-800 hover:bg-neutral-100 disabled:opacity-60";
export const field = "min-h-12 w-full rounded-lg border border-neutral-300 px-3 py-2 text-base focus:border-amber-600 focus:outline-none";

export function ActionMessage({ state }: { state: WorkshopActionState }) {
  if (state.status === "idle" || !state.message) return null;
  return (
    <p role={state.status === "error" ? "alert" : "status"} className={`text-sm ${state.status === "error" ? "text-red-700" : "text-green-700"}`}>
      {state.message}
    </p>
  );
}

const STEP_STYLE: Record<ProductionStep, string> = {
  cho_san_xuat: "bg-neutral-100 text-neutral-800",
  dang_in: "bg-blue-100 text-blue-900",
  dang_cat_cuon: "bg-indigo-100 text-indigo-900",
  dong_goi: "bg-purple-100 text-purple-900",
  san_sang_giao: "bg-amber-100 text-amber-900",
  da_giao: "bg-green-100 text-green-900",
  huy: "bg-neutral-200 text-neutral-600 line-through",
};

export function StepBadge({ step }: { step: ProductionStep }) {
  return <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${STEP_STYLE[step]}`}>{t.productionStep[step]}</span>;
}

const DUE_STYLE: Record<DueState, string> = {
  none: "text-neutral-500",
  overdue: "bg-red-600 text-white",
  today: "bg-orange-500 text-white",
  soon: "bg-yellow-200 text-yellow-900",
  ok: "text-neutral-700",
};

const DUE_LABEL: Partial<Record<DueState, string>> = {
  overdue: t.workshop.overdue,
  today: t.workshop.dueToday,
  soon: t.workshop.dueSoon,
};

export function DueBadge({ dueDate, step }: { dueDate: string | null; step: ProductionStep }) {
  const state = dueState(dueDate, step);
  if (state === "none") return <span className="text-sm text-neutral-500">{t.workshop.noDueDate}</span>;
  const label = DUE_LABEL[state];
  return (
    <span className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-sm font-medium ${DUE_STYLE[state]}`} data-due={state}>
      {formatDueDate(dueDate)}
      {label && <span>· {label}</span>}
    </span>
  );
}

export function ColorSwatches({ colors }: { colors: string[] | null }) {
  if (!colors?.length) return <span>—</span>;
  return (
    <span className="flex flex-wrap gap-2">
      {colors.map((c) => (
        <span key={c} className="inline-flex items-center gap-1 rounded border border-neutral-300 px-1.5 py-0.5 font-mono text-xs">
          {/* SVG fill attribute, not an inline style: the production CSP blocks style attributes. */}
          <svg aria-hidden width="16" height="16" viewBox="0 0 16 16" className="rounded-sm border border-neutral-300">
            <rect width="16" height="16" fill={/^#[0-9a-f]{3,8}$/i.test(c) ? c : "transparent"} />
          </svg>
          {c}
        </span>
      ))}
    </span>
  );
}
