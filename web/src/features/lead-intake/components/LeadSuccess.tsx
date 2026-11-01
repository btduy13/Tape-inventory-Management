"use client";
// Confirmation panel after a successful quote request.
import { format, getDictionary } from "@/i18n";

export function LeadSuccess({ code, onNew }: { code: string; onNew: () => void }) {
  const t = getDictionary().leadIntake;
  return (
    <div role="status" className="flex flex-col gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-5">
      <p className="text-lg font-semibold text-emerald-900">{t.success}</p>
      {code && <p className="text-sm text-emerald-900">{format(t.successCode, { code })}</p>}
      <button
        type="button"
        onClick={onNew}
        className="inline-flex min-h-11 w-fit cursor-pointer items-center rounded-lg border border-emerald-300 bg-white px-4 text-sm font-medium text-emerald-900 hover:bg-emerald-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
      >
        {t.newRequest}
      </button>
    </div>
  );
}
