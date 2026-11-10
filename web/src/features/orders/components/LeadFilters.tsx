// Quote-request list controls: status tabs (presets of the `status` filter, with counts) and a
// compact GET filter form (search + up to 2 selects, dates folded away). Selects/dates submit on
// change through AutoSubmit; search submits on Enter. Works without JS via the focusable submit.
import Link from "next/link";
import { format, getDictionary } from "@/i18n";
import { AutoSubmit } from "@/features/portal-ui/components/AutoSubmit";
import { Icon } from "@/features/portal-ui/components/Icon";
import { buttonClass, inputClass } from "@/features/portal-ui/components/styles";
import { listHref, patchListState, serializeListParams, type ListState } from "@/features/portal-ui";
import { LEAD_TABS, activeLeadTab, type LeadTabKey } from "../lib/lead-board";
import { LEAD_SOURCES, UNASSIGNED, type LeadListSpec } from "../lib/lead-list";
import type { AssigneeOption } from "../server/lead-list";

const t = getDictionary();
const c = t.leadsUi;
const p = t.portalUi;

const TAB_LABEL: Record<LeadTabKey, string> = {
  all: c.tabAll, new: c.tabNew, working: c.tabWorking, quoted: c.tabQuoted, won: c.tabWon, closed: c.tabClosed,
};

type Common = { basePath: string; spec: LeadListSpec; state: ListState };

export function LeadTabs({ basePath, spec, state, counts }: Common & { counts: Record<LeadTabKey, number> | null }) {
  const active = activeLeadTab(state.filters.status);
  return (
    <nav aria-label={c.tabsLabel} className="-mx-1 overflow-x-auto px-1">
      <ul className="flex min-w-max gap-1 border-b border-pt-line">
        {LEAD_TABS.map((tab) => {
          const on = tab.key === active;
          const href = listHref(basePath, spec, patchListState(state, { filters: { ...state.filters, status: [...tab.statuses] } }));
          return (
            <li key={tab.key}>
              <Link
                href={href}
                scroll={false}
                aria-current={on ? "page" : undefined}
                className={`-mb-px inline-flex min-h-11 items-center gap-2 border-b-2 px-3 text-sm ${on ? "border-vt-blue font-semibold text-vt-blue" : "border-transparent text-pt-muted hover:text-pt-text"}`}
              >
                {TAB_LABEL[tab.key]}
                {counts && (
                  <span className={`rounded-full px-2 py-0.5 text-xs tabular-nums ${on ? "bg-pt-blue-tint text-pt-blue-ink" : "bg-pt-grey-tint text-pt-grey-ink"}`}>
                    {counts[tab.key]}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

type FiltersProps = Common & { assignees: readonly AssigneeOption[]; mine: boolean };

export function LeadFilters({ basePath, spec, state, assignees, mine }: FiltersProps) {
  const own = new Set(["q", "assignee", "source", "from", "to", "page"]);
  // Tab (status), sort and page size ride along so filtering keeps them.
  const hidden = [...serializeListParams(spec, state).entries()].filter(([k]) => !own.has(k));
  const hasDates = !!(state.from || state.to);
  const active = !!state.q || hasDates || !!state.filters.assignee || !!state.filters.source;
  const cleared = patchListState(state, { q: "", from: null, to: null, filters: state.filters.status ? { status: state.filters.status } : {} });
  const selects = [
    ...(mine ? [] : [{
      name: "assignee",
      label: c.filterAssignee,
      options: [{ value: UNASSIGNED, label: c.unassigned }, ...assignees.map((a) => ({ value: a.id, label: a.name }))],
    }]),
    { name: "source", label: c.filterSource, options: LEAD_SOURCES.map((s) => ({ value: s, label: s === "preset" ? c.sourcePreset : c.sourceCustom })) },
  ];
  const dateLabel = (k: "from" | "to") => (k === "from" ? `${c.dateCreated}: ${p.fromDate.toLowerCase()}` : p.toDate);

  return (
    <form method="get" action={basePath} role="search" aria-label={p.filters} className="flex flex-col gap-2">
      <AutoSubmit />
      {hidden.map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      <div className="flex flex-col gap-2 md:flex-row md:items-center">
        <label className="relative min-w-0 flex-1">
          <span className="sr-only">{p.search}</span>
          <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-pt-muted" />
          <input type="search" name="q" defaultValue={state.q} placeholder={c.searchPlaceholder} maxLength={80} className={`${inputClass} pl-9`} />
        </label>
        <div className="grid gap-2 sm:grid-cols-2 md:flex">
          {selects.map((s) => (
            <label key={s.name} className="min-w-0 md:w-48">
              <span className="sr-only">{s.label}</span>
              <select name={s.name} defaultValue={state.filters[s.name]?.[0] ?? ""} className={inputClass}>
                <option value="">{format(c.filterAllOf, { label: s.label.toLowerCase() })}</option>
                {s.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </label>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap items-start gap-x-4 gap-y-2">
        <details open={hasDates} className="group">
          <summary className="inline-flex min-h-11 cursor-pointer list-none items-center gap-1 text-sm font-medium text-vt-blue [&::-webkit-details-marker]:hidden">
            <Icon name="chevronRight" className="size-4 transition-transform group-open:rotate-90" />
            {c.moreFilters}
          </summary>
          <fieldset className="grid grid-cols-2 gap-2 pb-1 sm:w-96">
            <legend className="sr-only">{c.dateCreated}</legend>
            {(["from", "to"] as const).map((k) => (
              <label key={k} className="flex flex-col gap-1 text-xs font-medium text-pt-muted">
                {dateLabel(k)}
                <input type="date" name={k} lang="vi" defaultValue={state[k] ?? ""} className={inputClass} />
              </label>
            ))}
          </fieldset>
        </details>
        {active && (
          <Link href={listHref(basePath, spec, cleared)} className="inline-flex min-h-11 items-center text-sm font-medium text-pt-muted underline-offset-2 hover:text-pt-text hover:underline">
            {p.clearFilters}
          </Link>
        )}
        {/* Enter in the search box submits; keyboard / no-JS users can also reach this button. */}
        <button type="submit" className={buttonClass("secondary", "sm", "sr-only focus:not-sr-only")}>{p.applyFilters}</button>
      </div>
    </form>
  );
}
