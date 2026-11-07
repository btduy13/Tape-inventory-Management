// Search + filters as a plain GET form (works without JS, shareable URLs, server-rendered).
// Every filter is a select. A multi-value filter takes comma-joined option values ("Đang mở" = several statuses).
import Link from "next/link";
import { format, getDictionary } from "@/i18n";
import {
  clearFilters, hasActiveFilters, listHref, serializeListParams,
  type ListSpec, type ListState,
} from "../lib/list-params";
import { AutoSubmit } from "./AutoSubmit";
import { Icon } from "./Icon";
import { buttonClass, inputClass } from "./styles";

const p = getDictionary().portalUi;

export type FilterOption = { value: string; label: string };

/** One filter of the spec as a select. For a multi enum an option value may join several values with ",". */
export type FilterControl = { name: string; label: string; kind: "select"; options: readonly FilterOption[] };

type Props = {
  basePath: string;
  spec: ListSpec;
  state: ListState;
  controls?: readonly FilterControl[];
  searchPlaceholder?: string;
  /** Show from/to date inputs (needs spec.dateRange). */
  dateRange?: boolean;
  dateLabel?: string;
  /** Filters "Xóa lọc" keeps (e.g. the tab a list is on). */
  pinned?: readonly string[];
};

export function FilterBar({ basePath, spec, state, controls = [], searchPlaceholder = p.searchPlaceholder, dateRange, dateLabel, pinned = [] }: Props) {
  const selects = controls;
  const formNames = new Set<string>(["q", "from", "to", "page", ...selects.map((c) => c.name)]);
  // Everything else in the current URL (sort, page size) rides along as hidden inputs.
  const hidden = [...serializeListParams(spec, state).entries()].filter(([k]) => !formNames.has(k));
  const cleared = clearFilters(state);
  for (const name of pinned) if (state.filters[name]) cleared.filters[name] = state.filters[name];
  const active = hasActiveFilters({ ...state, filters: Object.fromEntries(Object.entries(state.filters).filter(([k]) => !pinned.includes(k))) });
  const showDates = dateRange && !!spec.dateRange;

  return (
    <div className="flex flex-col gap-3">
      <form method="get" action={basePath} role="search" aria-label={p.filters} className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end">
        <AutoSubmit />
        {hidden.map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
        {spec.search && (
          <label className="flex min-w-0 flex-1 flex-col gap-1 text-sm font-medium lg:min-w-64">
            <span className="sr-only">{p.search}</span>
            <span className="relative">
              <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-pt-muted" />
              <input type="search" name="q" defaultValue={state.q} placeholder={searchPlaceholder} maxLength={80} className={`${inputClass} pl-9`} />
            </span>
          </label>
        )}
        <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:items-end">
          {selects.map((c) => (
            <label key={c.name} className="flex min-w-36 flex-col gap-1 text-xs font-medium text-pt-muted">
              {c.label}
              <FilterSelect control={c} values={state.filters[c.name] ?? []} />
            </label>
          ))}
          {showDates && (
            <fieldset className="col-span-2 flex flex-col gap-1">
              {dateLabel && <legend className="mb-1 text-xs font-medium text-pt-muted">{dateLabel}</legend>}
              <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col gap-1 text-xs font-medium text-pt-muted">
                  {p.fromDate}
                  <input type="date" name="from" defaultValue={state.from ?? ""} className={inputClass} />
                </label>
                <label className="flex flex-col gap-1 text-xs font-medium text-pt-muted">
                  {p.toDate}
                  <input type="date" name="to" defaultValue={state.to ?? ""} className={inputClass} />
                </label>
              </div>
            </fieldset>
          )}
        </div>
        <div className="flex gap-2">
          <button type="submit" className={buttonClass("primary", "md", "flex-1 lg:flex-none")}>{p.applyFilters}</button>
          {active && (
            <Link href={listHref(basePath, spec, cleared)} className={buttonClass("ghost", "md", "flex-1 lg:flex-none")}>
              {p.clearFilters}
            </Link>
          )}
        </div>
      </form>
    </div>
  );
}

/** The URL may hold a combination no option names (a stat card link, a hand-edited URL): keep it as an extra option. */
function FilterSelect({ control: c, values }: { control: FilterControl; values: readonly string[] }) {
  const current = values.join(",");
  const known = current === "" || c.options.some((o) => o.value === current);
  const labels = values.map((v) => c.options.find((o) => o.value === v)?.label ?? v);
  return (
    <select name={c.name} defaultValue={current} className={inputClass}>
      <option value="">{p.all}</option>
      {c.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      {!known && <option value={current}>{labels.length <= 2 ? labels.join(", ") : format(p.selectedCount, { count: labels.length })}</option>}
    </select>
  );
}
