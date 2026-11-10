// "Cần xử lý hôm nay": counts linking to the pre-filtered lists. Zero stays calm (muted outline),
// non-zero gets its tone tint so red keeps meaning "act now".
import Link from "next/link";
import { TONE_CLASS, surfaceClass, type Tone } from "@/features/portal-ui";
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
    <section aria-labelledby="can-xu-ly-title" className={`${surfaceClass} flex flex-col gap-2 p-4`}>
      <h2 id="can-xu-ly-title" className="text-base font-semibold text-pt-text">{c.attentionTitle}</h2>
      {/* A to-do list: label left, count right. 2 columns on phones / tablets, 1 in the rail. */}
      <ul className="grid grid-cols-1 gap-x-4 sm:grid-cols-2 xl:grid-cols-1">
        {items.map((it) => {
          const on = it.value > 0;
          return (
            <li key={it.label} className="min-w-0 border-t border-pt-line">
              <Link href={it.href} className="flex min-h-11 items-center justify-between gap-3 rounded-lg px-1 py-1.5 text-sm transition-colors hover:bg-pt-grey-tint">
                <span className={`leading-snug ${on ? "font-medium text-pt-text" : "text-pt-muted"}`}>{it.label}</span>
                <span className={`min-w-9 shrink-0 rounded-full px-2 py-0.5 text-center text-sm font-bold ${on ? TONE_CLASS[it.tone] : "text-pt-line-strong"}`}>{it.value}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
