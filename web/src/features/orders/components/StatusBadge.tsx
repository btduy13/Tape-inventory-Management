import { getDictionary } from "@/i18n";
import type { LeadStatus } from "@/lib/types";

const t = getDictionary();

const TONE: Record<LeadStatus, string> = {
  new: "bg-sky-100 text-sky-800",
  assigned: "bg-indigo-100 text-indigo-800",
  consulting: "bg-violet-100 text-violet-800",
  quoted: "bg-amber-100 text-amber-800",
  accepted: "bg-emerald-100 text-emerald-800",
  production: "bg-orange-100 text-orange-800",
  shipping: "bg-cyan-100 text-cyan-800",
  done: "bg-green-100 text-green-800",
  cancelled: "bg-neutral-200 text-neutral-600",
};

export function StatusBadge({ status }: { status: LeadStatus }) {
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${TONE[status]}`}>
      {t.leadStatus[status]}
    </span>
  );
}
