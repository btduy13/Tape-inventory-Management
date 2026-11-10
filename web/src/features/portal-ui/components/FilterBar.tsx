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
import { buttonClass, inputClass, surfaceClass } from "./styles";

const p = getDictionary().portalUi;

export type FilterOption = { value: string; label: string };

/** One filter of the spec as a select (for a multi enum an option value may join several values
 *  with ","), or a text box for a "text" filter (submits on Enter, like the search). */
export type FilterControl =
  | { name: string; label: string; kind: "select"; options: readonly FilterOption[] }
  | { name: string; label: string; kind: "text"; placeholder?: string };

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
  // One toolbar row: search + the first filters + buttons. The rest sits under "Lọc thêm",
  // open while one of them is set so an active filter is never hidden.
  const main = selects.slice(0, MAIN_CONTROLS);
  const extra = selects.slice(MAIN_CONTROLS);
  const hasExtra = extra.length > 0 || showDates;
  const extraOn = extra.filter((c) => state.filters[c.name]?.length).length + (showDates && (state.from || state.to) ? 1 : 0);
  const control = (c: FilterControl) => (
    <label key={c.name} className="flex min-w-0 flex-col gap-1 text-xs font-medium text-pt-muted lg:w-40">
      {c.label}
      {c.kind === "text" ? (
        <input type="search" name={c.name} defaultValue={state.filters[c.name]?.[0] ?? ""} placeholder={c.placeholder} maxLength={80} className={inputClass} />
      ) : (
        <FilterSelect control={c} values={state.filters[c.name] ?? []} />
      )}
    </label>
  );

  return (
    <form method="get" action={basePath} role="search" aria-label={p.filters} className={`${surfaceClass} flex flex-col gap-3 p-3`}>
      <AutoSubmit />
      {hidden.map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      <div className="grid grid-cols-2 items-end gap-3 lg:flex lg:flex-wrap">
        {spec.search && (
          <label className="col-span-2 flex min-w-0 flex-col gap-1 text-sm font-medium lg:min-w-64 lg:flex-1">
            <span className="sr-only">{p.search}</span>
            <span className="relative">
              <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-pt-muted" />
              <input type="search" name="q" defaultValue={state.q} placeholder={searchPlaceholder} maxLength={80} className={`${inputClass} pl-9`} />
            </span>
          </label>
        )}
        {main.map(control)}
        <div className="col-span-2 flex gap-2">
          <button type="submit" className={buttonClass("primary", "md", "flex-1 lg:flex-none")}>{p.applyFilters}</button>
          {active && (
            <Link href={listHref(basePath, spec, cleared)} className={buttonClass("ghost", "md", "flex-1 lg:flex-none")}>
              {p.clearFilters}
            </Link>
          )}
        </div>
      </div>
      {hasExtra && (
        <details open={extraOn > 0} className="group border-t border-pt-line pt-1">
          <summary className="inline-flex min-h-11 cursor-pointer list-none items-center gap-1.5 rounded-lg px-1 text-sm font-medium text-pt-blue-ink hover:underline [&::-webkit-details-marker]:hidden">
            <Icon name="chevronRight" className="size-3.5 transition-transform group-open:rotate-90" />
            {p.moreFilters}{extraOn > 0 ? ` (${extraOn})` : ""}
          </summary>
          <div className="grid grid-cols-2 items-end gap-3 pt-1 lg:flex lg:flex-wrap">
            {extra.map(control)}
            {showDates && (
              <fieldset className="col-span-2 min-w-0">
                {dateLabel && <legend className="sr-only">{dateLabel}</legend>}
                <div className="grid grid-cols-2 gap-3">
                  <label className="flex flex-col gap-1 text-xs font-medium text-pt-muted lg:w-40">
                    {dateLabel ? `${dateLabel}: ${p.fromDate.toLowerCase()}` : p.fromDate}
                    <input type="date" name="from" defaultValue={state.from ?? ""} className={inputClass} />
                  </label>
                  <label className="flex flex-col gap-1 text-xs font-medium text-pt-muted lg:w-40">
                    {p.toDate}
                    <input type="date" name="to" defaultValue={state.to ?? ""} className={inputClass} />
                  </label>
                </div>
              </fieldset>
            )}
          </div>
        </details>
      )}
    </form>
  );
}

/** Filters shown in the toolbar row; the others go under "Lọc thêm". */
const MAIN_CONTROLS = 3;

/** The URL may hold a combination no option names (a stat card link, a hand-edited URL): keep it as an extra option. */
function FilterSelect({ control: c, values }: { control: Extract<FilterControl, { kind: "select" }>; values: readonly string[] }) {
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
