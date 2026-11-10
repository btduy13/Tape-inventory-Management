// Universal (server or client) list: table on >= md, stacked cards on phones, from one column
// definition. Sorting is links (URL params, see lib/list-params.ts); a row link covers the row.
import Link from "next/link";
import { Fragment } from "react";
import { format, getDictionary } from "@/i18n";
import { listHref, toggleSort, type ListSpec, type ListState } from "../lib/list-params";
import { Icon } from "./Icon";
import { Pagination } from "./Pagination";
import { EmptyState, ErrorState } from "./States";
import { surfaceClass } from "./styles";

const p = getDictionary().portalUi;

export type Column<T> = {
  /** Unique id of the column. */
  key: string;
  header: string;
  cell: (row: T) => React.ReactNode;
  /** Key in spec.sort.keys; makes the header a sort link. */
  sortKey?: string;
  align?: "start" | "end";
  /** Tailwind width / visibility classes for the <th>/<td> (e.g. "w-40", "hidden xl:table-cell"). */
  className?: string;
  /** Role in the phone card: title (top left), badge (top right), meta (label: value), hidden. Default meta. */
  mobile?: "title" | "badge" | "meta" | "hidden";
};

/** Pass to enable sort headers + pagination (server lists driven by URL params). */
export type DataTableList = { basePath: string; spec: ListSpec; state: ListState; total: number };

type Props<T> = {
  /** Accessible name of the table. */
  caption: string;
  columns: readonly Column<T>[];
  rows: readonly T[];
  rowKey: (row: T) => string;
  /** Whole row (and card) opens this link. The first column's cell becomes the link. */
  rowHref?: (row: T) => string;
  /** Extra classes per row (e.g. highlight unread). */
  rowClassName?: (row: T) => string;
  /** Child line under a row (full-width row on desktop, bottom of the phone card); null = none. */
  subRow?: (row: T) => React.ReactNode;
  list?: DataTableList;
  /** Empty: shown when rows is empty. Use `filtered` to say "no match" instead of "nothing yet". */
  empty?: { title?: string; body?: string; action?: React.ReactNode };
  filtered?: boolean;
  /** Load error message: replaces the table. */
  error?: string | null;
};

function SortHeader<T>({ col, list }: { col: Column<T>; list: DataTableList }) {
  const on = list.state.sort === col.sortKey;
  const dir = on ? list.state.dir : null;
  const href = listHref(list.basePath, list.spec, toggleSort(list.spec, list.state, col.sortKey!));
  return (
    <Link href={href} scroll={false} className="inline-flex min-h-10 items-center gap-1 hover:text-vt-blue">
      {col.header}
      <Icon name={dir === "asc" ? "sortAsc" : dir === "desc" ? "sortDesc" : "sort"} className={`size-4 ${on ? "text-vt-blue" : "opacity-50"}`} />
      <span className="sr-only">{format(p.sortBy, { column: col.header })}</span>
    </Link>
  );
}

const ariaSort = (on: boolean, dir: string) => (on ? (dir === "asc" ? "ascending" : "descending") : undefined);

export function DataTable<T>({ caption, columns, rows, rowKey, rowHref, rowClassName, subRow, list, empty, filtered, error }: Props<T>) {
  if (error) return <ErrorState body={error} />;
  const body = rows.length === 0 ? (
    <EmptyState title={filtered ? p.emptyFiltered : empty?.title} body={empty?.body} action={empty?.action} />
  ) : (
    <>
      <div className={`${surfaceClass} hidden overflow-x-auto md:block`}>
        <table className="w-full text-left text-sm">
          <caption className="sr-only">{caption}</caption>
          <thead className="border-b border-pt-line bg-pt-canvas text-xs text-pt-muted">
            <tr>
              {columns.map((c) => {
                const on = !!list && !!c.sortKey && list.state.sort === c.sortKey;
                return (
                  <th key={c.key} scope="col" aria-sort={list ? ariaSort(on, list.state.dir) : undefined} className={`whitespace-nowrap px-3 py-0.5 font-semibold first:pl-4 last:pr-4 ${c.align === "end" ? "text-right" : ""} ${c.className ?? ""}`}>
                    {list && c.sortKey ? <SortHeader col={c} list={list} /> : <span className="inline-flex min-h-10 items-center">{c.header}</span>}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const sub = subRow?.(r);
              return (
              <Fragment key={rowKey(r)}>
              <tr className={`pt-row border-t border-pt-line first:border-t-0 transition-colors ${rowHref ? "hover:bg-pt-blue-tint/50" : "hover:bg-pt-canvas"} ${rowClassName?.(r) ?? ""}`}>
                {columns.map((c, i) => (
                  <td key={c.key} className={`px-3 py-3 align-middle first:pl-4 last:pr-4 ${c.align === "end" ? "text-right" : ""} ${c.className ?? ""}`}>
                    {i === 0 && rowHref ? <Link href={rowHref(r)} className="pt-row-link font-semibold text-vt-blue hover:underline">{c.cell(r)}</Link> : c.cell(r)}
                  </td>
                ))}
              </tr>
              {sub && (
                <tr className={rowClassName?.(r) ?? ""}>
                  <td colSpan={columns.length} className="px-3 pb-3 pt-0">{sub}</td>
                </tr>
              )}
              </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
      {list && <MobileSort columns={columns} list={list} />}
      <ul aria-label={caption} className="flex flex-col gap-2 md:hidden">
        {rows.map((r) => <MobileCard key={rowKey(r)} row={r} columns={columns} href={rowHref?.(r)} extra={rowClassName?.(r)} sub={subRow?.(r)} />)}
      </ul>
    </>
  );
  return (
    <div className="flex flex-col gap-3">
      {body}
      {list && <Pagination {...list} />}
    </div>
  );
}

/** Phones have no table header: sortable columns become a row of chips. */
function MobileSort<T>({ columns, list }: { columns: readonly Column<T>[]; list: DataTableList }) {
  const sortable = columns.filter((c) => c.sortKey);
  if (sortable.length === 0) return null;
  return (
    <nav aria-label={p.sortLabel} className="-mx-1 flex items-center gap-2 overflow-x-auto px-1 pb-1 md:hidden">
      <span className="shrink-0 text-xs text-pt-muted">{p.sortLabel}:</span>
      {sortable.map((c) => {
        const on = list.state.sort === c.sortKey;
        return (
          <Link
            key={c.key}
            href={listHref(list.basePath, list.spec, toggleSort(list.spec, list.state, c.sortKey!))}
            scroll={false}
            aria-current={on ? "true" : undefined}
            className={`inline-flex min-h-11 shrink-0 items-center gap-1 rounded-full border px-3 text-sm ${on ? "border-vt-blue font-semibold text-vt-blue" : "border-pt-line-strong text-pt-text"}`}
          >
            {c.header}
            {on && <Icon name={list.state.dir === "asc" ? "sortAsc" : "sortDesc"} className="size-4" />}
            {on && <span className="sr-only">({list.state.dir === "asc" ? p.sortedAsc : p.sortedDesc})</span>}
          </Link>
        );
      })}
    </nav>
  );
}

function MobileCard<T>({ row, columns, href, extra = "", sub }: { row: T; columns: readonly Column<T>[]; href?: string; extra?: string; sub?: React.ReactNode }) {
  const titleCols = columns.filter((c, i) => c.mobile === "title" || (i === 0 && !c.mobile));
  const badges = columns.filter((c) => c.mobile === "badge");
  const meta = columns.filter((c, i) => !titleCols.includes(c) && (c.mobile ?? (i === 0 ? "title" : "meta")) === "meta");
  const title = titleCols.map((c) => <span key={c.key}>{c.cell(row)}</span>);
  return (
    <li className={`pt-row ${surfaceClass} flex flex-col gap-2 p-4 ${extra}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-0.5 font-semibold">
          {href ? <Link href={href} className="pt-row-link text-vt-blue">{title}</Link> : title}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">{badges.map((c) => <span key={c.key}>{c.cell(row)}</span>)}</div>
      </div>
      {meta.length > 0 && (
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
          {meta.map((c) => (
            <div key={c.key} className="contents">
              <dt className="text-pt-muted">{c.header}</dt>
              <dd className="min-w-0 break-words text-pt-text">{c.cell(row)}</dd>
            </div>
          ))}
        </dl>
      )}
      {sub}
    </li>
  );
}
