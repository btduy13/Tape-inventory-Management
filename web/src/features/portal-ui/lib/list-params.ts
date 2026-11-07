// URL search params <-> list state (sort, search, filters, date range, pagination).
// Pure and isomorphic. Every value read from the URL is checked against the spec's
// whitelist; unknown keys and values are dropped, never passed through.

export type SortDir = "asc" | "desc";

export type SortKeyDef = { column: string; firstDir?: SortDir };

export type FilterDef =
  /** One or many values out of a fixed list (`?status=new,quoted`). */
  | { kind: "enum"; column: string; values: readonly string[]; multi?: boolean }
  /** Yes / no (`?active=1` or `?active=0`). */
  | { kind: "bool"; column: string };

export type ListSpec = {
  sort: { keys: Readonly<Record<string, SortKeyDef>>; default: { key: string; dir: SortDir }; tiebreak?: string };
  /** Columns matched by the text search (`?q=`). */
  search?: { columns: readonly string[]; maxLength?: number };
  filters?: Readonly<Record<string, FilterDef>>;
  /** Date column filtered by `?from=YYYY-MM-DD&to=YYYY-MM-DD` (Vietnam calendar days). */
  dateRange?: { column: string; type?: "timestamptz" | "date" };
  /** Allowed page sizes; the first one is the default. */
  pageSizes?: readonly number[];
};

export type ListState = {
  q: string;
  sort: string;
  dir: SortDir;
  filters: Record<string, string[]>;
  from: string | null;
  to: string | null;
  page: number;
  pageSize: number;
};

export type RawParams = URLSearchParams | Readonly<Record<string, string | string[] | undefined>>;

export const RESERVED_PARAMS = ["q", "sort", "dir", "from", "to", "page", "size"] as const;
const DEFAULT_PAGE_SIZES = [25, 50, 100] as const;
const MAX_PAGE = 10_000;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Validates a spec once (call at module level). Throws on programmer errors only. */
export function defineListSpec<const S extends ListSpec>(spec: S): S {
  if (!spec.sort.keys[spec.sort.default.key]) throw new Error(`default sort key "${spec.sort.default.key}" is not sortable`);
  for (const name of Object.keys(spec.filters ?? {})) {
    if ((RESERVED_PARAMS as readonly string[]).includes(name)) throw new Error(`filter name "${name}" is reserved`);
  }
  if (spec.pageSizes && spec.pageSizes.length === 0) throw new Error("pageSizes must not be empty");
  return spec;
}

function first(raw: RawParams, key: string): string | undefined {
  if (raw instanceof URLSearchParams) return raw.get(key) ?? undefined;
  const v = raw[key];
  return Array.isArray(v) ? v[0] : v;
}

export function pageSizesOf(spec: ListSpec): readonly number[] {
  return spec.pageSizes ?? DEFAULT_PAGE_SIZES;
}

/** Keeps letters (any script, incl. Vietnamese marks), digits, space and `@ . + -`. */
export function sanitizeSearch(input: string | undefined, maxLength = 80): string {
  if (!input) return "";
  return input
    .normalize("NFC")
    .replace(/[^\p{L}\p{M}\p{N} @.+-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength)
    .trim();
}

export function isValidDate(s: string | undefined | null): s is string {
  if (!s || !DATE_RE.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

function parseFilter(def: FilterDef, raw: string | undefined): string[] {
  if (!raw) return [];
  if (def.kind === "bool") return raw === "1" || raw === "0" ? [raw] : [];
  const wanted = new Set(raw.split(",").map((s) => s.trim()));
  const picked = def.values.filter((v) => wanted.has(v)); // spec order, deduped
  return def.multi ? picked : picked.slice(0, 1);
}

function parseIntIn(raw: string | undefined, min: number, max: number): number | null {
  if (!raw || !/^\d{1,6}$/.test(raw)) return null;
  const n = Number(raw);
  return n >= min && n <= max ? n : null;
}

export function defaultListState(spec: ListSpec): ListState {
  return {
    q: "",
    sort: spec.sort.default.key,
    dir: spec.sort.default.dir,
    filters: {},
    from: null,
    to: null,
    page: 1,
    pageSize: pageSizesOf(spec)[0]!,
  };
}

export function parseListParams(spec: ListSpec, raw: RawParams): ListState {
  const state = defaultListState(spec);
  if (spec.search) state.q = sanitizeSearch(first(raw, "q"), spec.search.maxLength);

  const sort = first(raw, "sort");
  if (sort && Object.hasOwn(spec.sort.keys, sort)) {
    state.sort = sort;
    state.dir = spec.sort.keys[sort]!.firstDir ?? "asc";
  }
  const dir = first(raw, "dir");
  if (dir === "asc" || dir === "desc") state.dir = dir;

  for (const [name, def] of Object.entries(spec.filters ?? {})) {
    const values = parseFilter(def, first(raw, name));
    if (values.length > 0) state.filters[name] = values;
  }

  if (spec.dateRange) {
    const from = first(raw, "from");
    const to = first(raw, "to");
    state.from = isValidDate(from) ? from : null;
    state.to = isValidDate(to) ? to : null;
    if (state.from && state.to && state.from > state.to) [state.from, state.to] = [state.to, state.from];
  }

  state.page = parseIntIn(first(raw, "page"), 1, MAX_PAGE) ?? 1;
  const size = parseIntIn(first(raw, "size"), 1, 1000);
  if (size && pageSizesOf(spec).includes(size)) state.pageSize = size;
  return state;
}

/** Only non-default values are written, in a stable order. */
export function serializeListParams(spec: ListSpec, state: ListState): URLSearchParams {
  const d = defaultListState(spec);
  const out = new URLSearchParams();
  if (state.q) out.set("q", state.q);
  for (const name of Object.keys(spec.filters ?? {})) {
    const v = state.filters[name];
    if (v && v.length > 0) out.set(name, v.join(","));
  }
  if (state.from) out.set("from", state.from);
  if (state.to) out.set("to", state.to);
  if (state.sort !== d.sort || state.dir !== d.dir) {
    out.set("sort", state.sort);
    out.set("dir", state.dir);
  }
  if (state.pageSize !== d.pageSize) out.set("size", String(state.pageSize));
  if (state.page > 1) out.set("page", String(state.page));
  return out;
}

export function listHref(basePath: string, spec: ListSpec, state: ListState): string {
  const qs = serializeListParams(spec, state).toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

/** New state with `patch` applied. Anything but a page change goes back to page 1. */
export function patchListState(state: ListState, patch: Partial<ListState>): ListState {
  const next = { ...state, ...patch, filters: { ...(patch.filters ?? state.filters) } };
  if (patch.page === undefined) next.page = 1;
  return next;
}

/** Header click: same column flips direction, another column starts at its first direction. */
export function toggleSort(spec: ListSpec, state: ListState, key: string): ListState {
  if (!Object.hasOwn(spec.sort.keys, key)) return state;
  const dir: SortDir = state.sort === key ? (state.dir === "asc" ? "desc" : "asc") : spec.sort.keys[key]!.firstDir ?? "asc";
  return patchListState(state, { sort: key, dir });
}

export function clearFilters(state: ListState): ListState {
  return patchListState(state, { q: "", filters: {}, from: null, to: null });
}

export function hasActiveFilters(state: ListState): boolean {
  return !!state.q || !!state.from || !!state.to || Object.keys(state.filters).length > 0;
}

export function pageCount(total: number, pageSize: number): number {
  return Math.max(1, Math.ceil(Math.max(0, total) / pageSize));
}

/** Page actually shown: 1..pageCount. A shared link or a realtime shrink can point past the end. */
export function clampPage(page: number, total: number, pageSize: number): number {
  return Math.min(Math.max(1, page), pageCount(total, pageSize));
}

/** Rows of the shown page (clamped, so ?page=99 shows the last page, not a false empty state). */
export function pageSlice<T>(rows: readonly T[], state: Pick<ListState, "page" | "pageSize">): T[] {
  const start = (clampPage(state.page, rows.length, state.pageSize) - 1) * state.pageSize;
  return rows.slice(start, start + state.pageSize);
}
