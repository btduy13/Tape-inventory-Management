// Result count, page size and prev / next as links (server-friendly, no JS).
import Link from "next/link";
import { format, getDictionary } from "@/i18n";
import { clampPage, listHref, pageCount, pageSizesOf, patchListState, type ListSpec, type ListState } from "../lib/list-params";
import { Icon } from "./Icon";
import { buttonClass } from "./styles";

const p = getDictionary().portalUi;

type Props = { basePath: string; spec: ListSpec; state: ListState; total: number };

export function Pagination({ basePath, spec, state, total }: Props) {
  const pages = pageCount(total, state.pageSize);
  const page = clampPage(state.page, total, state.pageSize);
  const href = (n: number) => listHref(basePath, spec, patchListState(state, { page: n }));
  const sizes = pageSizesOf(spec);
  const nav = (dir: "prev" | "next") => {
    const target = dir === "prev" ? page - 1 : page + 1;
    const disabled = target < 1 || target > pages;
    const label = dir === "prev" ? p.prevPage : p.nextPage;
    const icon = <Icon name={dir === "prev" ? "chevronLeft" : "chevronRight"} />;
    return disabled ? (
      <span aria-disabled="true" className={buttonClass("secondary", "sm", "pointer-events-none opacity-40")}>{icon}<span className="sr-only">{label}</span></span>
    ) : (
      <Link href={href(target)} rel={dir} className={buttonClass("secondary", "sm")}>{icon}<span className="sr-only">{label}</span></Link>
    );
  };

  return (
    <nav aria-label={p.pagination} className="flex flex-wrap items-center justify-between gap-3 text-sm text-pt-muted">
      <span>{format(p.resultCount, { count: total.toLocaleString("vi-VN") })}</span>
      <div className="flex flex-wrap items-center gap-3">
        {sizes.length > 1 && (
          <span className="flex items-center gap-1">
            <span>{p.rowsPerPage}:</span>
            {sizes.map((s) => (
              <Link
                key={s}
                href={listHref(basePath, spec, patchListState(state, { pageSize: s }))}
                aria-current={s === state.pageSize ? "true" : undefined}
                className={`inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg ${s === state.pageSize ? "font-bold text-pt-text" : "hover:bg-pt-grey-tint"}`}
              >
                {s}
              </Link>
            ))}
          </span>
        )}
        <span className="flex items-center gap-2">
          {nav("prev")}
          <span className="min-w-20 text-center text-pt-text">{format(p.pageOf, { page, pages })}</span>
          {nav("next")}
        </span>
      </div>
    </nav>
  );
}
