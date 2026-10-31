import Link from "next/link";
import { getDictionary } from "@/i18n";
import { LEAD_STATUSES, type LeadStatus } from "@/lib/types";

const t = getDictionary();

/** Server-rendered filter links (`?status=`). */
export function StatusFilter({ basePath, current }: { basePath: string; current: LeadStatus | null }) {
  const item = (label: string, status: LeadStatus | null) => {
    const active = status === current;
    const href = status ? `${basePath}?status=${status}` : basePath;
    return (
      <Link
        key={status ?? "all"}
        href={href}
        aria-current={active ? "page" : undefined}
        className={`rounded-full border px-3 py-1 text-xs ${active ? "border-amber-700 bg-amber-700 text-white" : "border-neutral-300 text-neutral-700 hover:bg-neutral-100"}`}
      >
        {label}
      </Link>
    );
  };
  return (
    <nav className="flex flex-wrap gap-2" aria-label={t.orders.status}>
      {item(t.orders.filterAll, null)}
      {LEAD_STATUSES.map((s) => item(t.leadStatus[s], s))}
    </nav>
  );
}
