// Applies a parsed ListState to a Supabase (PostgREST) query builder.
// Column names come ONLY from the spec whitelist; user text only reaches PostgREST as a
// sanitized ilike operand. RLS still decides which rows exist for the caller.
import { type ListSpec, type ListState, sanitizeSearch } from "./list-params";

/** The subset of PostgrestFilterBuilder we use (structural, so tests can pass a fake). */
export interface ListQuery<Q> {
  order(column: string, options: { ascending: boolean; nullsFirst?: boolean }): Q;
  in(column: string, values: readonly string[]): Q;
  eq(column: string, value: string | boolean): Q;
  gte(column: string, value: string): Q;
  lt(column: string, value: string): Q;
  or(filters: string): Q;
  range(from: number, to: number): Q;
}

const VN_OFFSET = "+07:00";

/** YYYY-MM-DD + 1 day (calendar math in UTC, no DST involved). */
export function nextDay(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

/** PostgREST `or` operand: wildcards around a sanitized term, double-quoted. */
export function searchOrFilter(columns: readonly string[], q: string): string | null {
  const term = sanitizeSearch(q);
  if (!term || columns.length === 0) return null;
  return columns.map((c) => `${c}.ilike."*${term}*"`).join(",");
}

export type ApplyOptions = { paginate?: boolean };

export function applyListQuery<Q extends ListQuery<Q>>(query: Q, spec: ListSpec, state: ListState, options: ApplyOptions = {}): Q {
  let q = query;

  if (spec.search && state.q) {
    const or = searchOrFilter(spec.search.columns, state.q);
    if (or) q = q.or(or);
  }

  for (const [name, def] of Object.entries(spec.filters ?? {})) {
    const values = state.filters[name];
    if (!values || values.length === 0) continue;
    if (def.kind === "bool") {
      if (values[0] === "1" || values[0] === "0") q = q.eq(def.column, values[0] === "1");
      continue;
    }
    if (def.kind === "text") {
      // Same operand shape as the search: sanitized term (no quotes / commas / wildcards left), double-quoted.
      q = q.or(`${def.column}.ilike."*${values[0]!}*"`);
      continue;
    }
    const allowed = values.filter((v) => def.values.includes(v));
    if (allowed.length === 1) q = q.eq(def.column, allowed[0]!);
    else if (allowed.length > 1) q = q.in(def.column, allowed);
  }

  if (spec.dateRange) {
    const { column, type = "timestamptz" } = spec.dateRange;
    const at = (d: string) => (type === "date" ? d : `${d}T00:00:00${VN_OFFSET}`);
    if (state.from) q = q.gte(column, at(state.from));
    if (state.to) q = q.lt(column, at(nextDay(state.to)));
  }

  const sortDef = Object.hasOwn(spec.sort.keys, state.sort) ? spec.sort.keys[state.sort]! : spec.sort.keys[spec.sort.default.key]!;
  const ascending = state.dir === "asc";
  q = q.order(sortDef.column, { ascending, nullsFirst: false });
  if (spec.sort.tiebreak && spec.sort.tiebreak !== sortDef.column) q = q.order(spec.sort.tiebreak, { ascending });

  if (options.paginate !== false) {
    const start = (state.page - 1) * state.pageSize;
    q = q.range(start, start + state.pageSize - 1);
  }
  return q;
}
