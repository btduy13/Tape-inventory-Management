"use client";
// Confirmation panel after a successful quote request.
import { format, getDictionary } from "@/i18n";

export function LeadSuccess({ code, onNew }: { code: string; onNew: () => void }) {
  const t = getDictionary().leadIntake;
  return (
    <div role="status" className="flex flex-col gap-3 rounded-xl border border-green-200 bg-green-50 p-6">
      <p className="text-lg font-semibold text-green-900">{t.success}</p>
      {code && <p className="text-green-800">{format(t.successCode, { code })}</p>}
      <button
        type="button"
        onClick={onNew}
        className="w-fit rounded-lg border border-green-300 px-4 py-2 text-sm font-medium text-green-900 hover:bg-green-100"
      >
        {t.newRequest}
      </button>
    </div>
  );
}
