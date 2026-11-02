// View switch (board / table) and the board's sort chips. Plain links over the URL list state,
// so filters, search and sort survive every switch.
import Link from "next/link";
import { Icon, listHref, toggleSort, type ListSpec, type ListState } from "@/features/portal-ui";
import { getDictionary } from "@/i18n";
import { wsCopy } from "../lib/copy";
import { withView, type JobView } from "../lib/list";

const p = getDictionary().portalUi;

const chip = (on: boolean) =>
  `inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border px-4 text-sm font-medium ${
    on ? "border-vt-blue bg-vt-blue text-white" : "border-pt-line-strong bg-pt-surface text-pt-text hover:border-vt-blue"
  }`;

type Props = { basePath: string; spec: ListSpec; state: ListState };

export function ViewToggle({ basePath, spec, state, view, role }: Props & { view: JobView; role: string }) {
  const to = (v: JobView) => listHref(basePath, spec, withView(state, v, role));
  return (
    <nav aria-label={wsCopy.view} className="flex gap-2">
      {(["board", "table"] as const).map((v) => (
        <Link key={v} href={to(v)} scroll={false} aria-current={view === v ? "page" : undefined} className={chip(view === v)}>
          {view === v && <Icon name="check" className="size-4" />}
          {v === "board" ? wsCopy.viewBoard : wsCopy.viewTable}
        </Link>
      ))}
    </nav>
  );
}

const BOARD_SORTS = [
  ["due", wsCopy.sortDue],
  ["updated", wsCopy.sortUpdated],
  ["code", wsCopy.sortCode],
  ["qty", wsCopy.sortQty],
] as const;

/** The board has no table header: sort keys as chips (same toggle rules as the table headers). */
export function BoardSort({ basePath, spec, state }: Props) {
  return (
    <nav aria-label={p.sortLabel} className="relative -mx-1 flex items-center gap-2 overflow-x-auto px-1 pb-1">
      <span className="shrink-0 text-sm text-pt-muted">{p.sortLabel}:</span>
      {BOARD_SORTS.map(([key, label]) => {
        const on = state.sort === key;
        return (
          <Link key={key} href={listHref(basePath, spec, toggleSort(spec, state, key))} scroll={false} aria-current={on ? "true" : undefined} className={chip(on)}>
            {label}
            {on && <Icon name={state.dir === "asc" ? "sortAsc" : "sortDesc"} className="size-4" />}
            {on && <span className="sr-only">({state.dir === "asc" ? p.sortedAsc : p.sortedDesc})</span>}
          </Link>
        );
      })}
    </nav>
  );
}
