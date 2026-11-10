// "Cần xử lý hôm nay": counts linking to the pre-filtered lists. Zero stays calm (muted outline),
// non-zero gets its tone tint so red keeps meaning "act now".
import Link from "next/link";
import { TONE_CLASS, type Tone } from "@/features/portal-ui";
import { dashboardCopy as c } from "../../lib/copy";
import { leadsHref, ordersHref, type Overview } from "../../lib/overview";

type Item = { label: string; value: number; href: string; tone: Tone };

const byDue = { sort: "ngay_du_kien", dir: "asc" };

export function AttentionStrip({ a }: { a: Overview["attention"] }) {
  const items: Item[] = [
    { label: c.overdue, value: a.overdue, href: ordersHref({ type: "all", due: "overdue", ...byDue }), tone: "red" },
    { label: c.dueSoon, value: a.dueSoon, href: ordersHref({ type: "all", due: "soon", ...byDue }), tone: "amber" },
    { label: c.notInWorkshop, value: a.notInWorkshop, href: ordersHref({ step: "none", delivered: "0" }), tone: "amber" },
    { label: c.leadsNew, value: a.leadsNew, href: leadsHref({ status: "new", assignee: "none" }), tone: "red" },
    { label: c.leadsConsulting, value: a.leadsConsulting, href: leadsHref({ status: "consulting" }), tone: "blue" },
    { label: c.leadsQuoted, value: a.leadsQuoted, href: leadsHref({ status: "quoted" }), tone: "blue" },
  ];
  return (
    <section aria-labelledby="can-xu-ly-title" className="flex flex-col gap-3">
      <h2 id="can-xu-ly-title" className="text-base font-semibold text-pt-text">{c.attentionTitle}</h2>
      <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {items.map((it) => {
          const on = it.value > 0;
          return (
            <li key={it.label} className="min-w-0">
              <Link href={it.href}
                className={`flex h-full min-h-20 flex-col justify-between gap-1 rounded-xl border p-3 transition-colors ${
                  on ? `${TONE_CLASS[it.tone]} border-transparent hover:brightness-95` : "border-pt-line bg-pt-surface text-pt-muted hover:border-pt-line-strong"
                }`}>
                <span className={`text-2xl font-bold leading-none ${on ? "" : "text-pt-line-strong"}`}>{it.value}</span>
                <span className="text-sm leading-snug">{it.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
