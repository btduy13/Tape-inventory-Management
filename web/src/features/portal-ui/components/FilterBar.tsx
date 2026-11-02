// Search + filters as a plain GET form (works without JS, shareable URLs, server-rendered).
// Multi-value enums render as chips (links); single enums / yes-no render as selects.
import Link from "next/link";
import { getDictionary } from "@/i18n";
import {
  clearFilters, hasActiveFilters, listHref, serializeListParams, toggleFilterValue,
  type ListSpec, type ListState,
} from "../lib/list-params";
import { AutoSubmit } from "./AutoSubmit";
import { Icon } from "./Icon";
import { buttonClass, inputClass } from "./styles";

const p = getDictionary().portalUi;

export type FilterOption = { value: string; label: string };

/** How to render one filter of the spec. `kind: "select"` works for single enum and bool filters. */
export type FilterControl =
  | { name: string; label: string; kind: "select"; options: readonly FilterOption[] }
  | { name: string; label: string; kind: "chips"; options: readonly FilterOption[] };

type Props = {
  basePath: string;
  spec: ListSpec;
  state: ListState;
  controls?: readonly FilterControl[];
  searchPlaceholder?: string;
  /** Show from/to date inputs (needs spec.dateRange). */
  dateRange?: boolean;
  dateLabel?: string;
};

export function FilterBar({ basePath, spec, state, controls = [], searchPlaceholder = p.searchPlaceholder, dateRange, dateLabel }: Props) {
  const selects = controls.filter((c) => c.kind === "select");
  const chips = controls.filter((c) => c.kind === "chips");
  const formNames = new Set<string>(["q", "from", "to", "page", ...selects.map((c) => c.name)]);
  // Everything else in the current URL (chips, sort, page size) rides along as hidden inputs.
  const hidden = [...serializeListParams(spec, state).entries()].filter(([k]) => !formNames.has(k));
  const active = hasActiveFilters(state);
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
              <select name={c.name} defaultValue={state.filters[c.name]?.[0] ?? ""} className={inputClass}>
                <option value="">{p.all}</option>
                {c.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
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
            <Link href={listHref(basePath, spec, clearFilters(state))} className={buttonClass("ghost", "md", "flex-1 lg:flex-none")}>
              {p.clearFilters}
            </Link>
          )}
        </div>
      </form>
      {chips.map((c) => (
        <nav key={c.name} aria-label={c.label} className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          <FilterChip href={listHref(basePath, spec, { ...state, page: 1, filters: omit(state.filters, c.name) })} on={!state.filters[c.name]?.length}>
            {p.all}
          </FilterChip>
          {c.options.map((o) => (
            <FilterChip key={o.value} href={listHref(basePath, spec, toggleFilterValue(spec, state, c.name, o.value))} on={!!state.filters[c.name]?.includes(o.value)}>
              {o.label}
            </FilterChip>
          ))}
        </nav>
      ))}
    </div>
  );
}

function omit(filters: Record<string, string[]>, name: string): Record<string, string[]> {
  const out = { ...filters };
  delete out[name];
  return out;
}

function FilterChip({ href, on, children }: { href: string; on: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={on ? "true" : undefined}
      scroll={false}
      className={`inline-flex min-h-11 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-4 text-sm font-medium ${
        on ? "border-vt-blue bg-vt-blue text-white" : "border-pt-line-strong bg-pt-surface text-pt-text hover:border-vt-blue"
      }`}
    >
      {on && <Icon name="check" className="size-4" />}
      {children}
    </Link>
  );
}
