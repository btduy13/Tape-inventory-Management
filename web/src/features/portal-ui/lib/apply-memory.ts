// Same ListState semantics as apply-query.ts, for small lists already loaded in memory
// (users, presets, widths, workshop jobs from the workshop_jobs() RPC).
// Search here also ignores Vietnamese accents ("nguyen" finds "Nguyễn").
import { nextDay } from "./apply-query";
import { type ListSpec, type ListState, pageSlice, sanitizeSearch } from "./list-params";

type Row = Readonly<Record<string, unknown>>;

/** Lowercase, no diacritics, đ -> d. */
export function foldText(s: string): string {
  return s.normalize("NFD").replace(/\p{M}/gu, "").replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase();
}

const asText = (v: unknown) => (v === null || v === undefined ? "" : String(v));

function compare(a: unknown, b: unknown): number {
  const an = a === null || a === undefined || a === "";
  const bn = b === null || b === undefined || b === "";
  if (an || bn) return an === bn ? 0 : an ? 1 : -1; // empties last, both directions (caller flips)
  if (typeof a === "number" && typeof b === "number") return a - b;
  if (typeof a === "boolean" && typeof b === "boolean") return Number(a) - Number(b);
  return asText(a).localeCompare(asText(b), "vi", { numeric: true, sensitivity: "base" });
}

/** Day key (YYYY-MM-DD) of a value in Vietnam time; date-only strings pass through. */
function vnDay(v: unknown): string | null {
  const s = asText(v);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  return new Date(d.getTime() + 7 * 3600_000).toISOString().slice(0, 10);
}

export type MemoryResult<T> = { rows: T[]; total: number };

export function applyListInMemory<T extends Row>(rows: readonly T[], spec: ListSpec, state: ListState, options: { paginate?: boolean } = {}): MemoryResult<T> {
  let out = [...rows];

  const term = spec.search ? foldText(sanitizeSearch(state.q)) : "";
  if (term && spec.search) {
    const cols = spec.search.columns;
    out = out.filter((r) => cols.some((c) => foldText(asText(r[c])).includes(term)));
  }

  for (const [name, def] of Object.entries(spec.filters ?? {})) {
    const values = state.filters[name];
    if (!values || values.length === 0) continue;
    if (def.kind === "bool") {
      const want = values[0] === "1";
      out = out.filter((r) => Boolean(r[def.column]) === want);
    } else {
      const set = new Set(values.filter((v) => def.values.includes(v)));
      out = out.filter((r) => set.has(asText(r[def.column])));
    }
  }

  if (spec.dateRange && (state.from || state.to)) {
    const col = spec.dateRange.column;
    const end = state.to ? nextDay(state.to) : null;
    out = out.filter((r) => {
      const day = vnDay(r[col]);
      if (!day) return false;
      return (!state.from || day >= state.from) && (!end || day < end);
    });
  }

  const def = Object.hasOwn(spec.sort.keys, state.sort) ? spec.sort.keys[state.sort]! : spec.sort.keys[spec.sort.default.key]!;
  const sign = state.dir === "asc" ? 1 : -1;
  const tie = spec.sort.tiebreak;
  out.sort((a, b) => {
    const av = a[def.column];
    const bv = b[def.column];
    const emptyA = av === null || av === undefined || av === "";
    const emptyB = bv === null || bv === undefined || bv === "";
    if (emptyA !== emptyB) return emptyA ? 1 : -1; // nulls last in both directions (matches nullsFirst: false)
    const c = compare(av, bv) * sign;
    return c !== 0 || !tie ? c : compare(a[tie], b[tie]) * sign;
  });

  const total = out.length;
  if (options.paginate !== false) out = pageSlice(out, state);
  return { rows: out, total };
}
