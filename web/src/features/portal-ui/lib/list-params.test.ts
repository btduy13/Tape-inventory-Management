import { describe, expect, it } from "vitest";
import {
  clampPage, clearFilters, defaultListState, defineListSpec, hasActiveFilters, isValidDate, listHref, pageCount, pageSlice,
  parseListParams, patchListState, sanitizeSearch, serializeListParams, toggleFilterValue, toggleSort,
} from "./list-params";

const spec = defineListSpec({
  sort: {
    keys: { updated: { column: "updated_at", firstDir: "desc" }, code: { column: "code" }, name: { column: "customer_name" } },
    default: { key: "updated", dir: "desc" },
    tiebreak: "id",
  },
  search: { columns: ["code", "customer_name", "phone"] },
  filters: {
    status: { kind: "enum", column: "status", values: ["new", "assigned", "quoted"], multi: true },
    owner: { kind: "enum", column: "assigned_to", values: ["a", "b"] },
    active: { kind: "bool", column: "is_active" },
  },
  dateRange: { column: "created_at" },
  pageSizes: [25, 50],
});

describe("defineListSpec", () => {
  it("rejects a default sort key that is not sortable", () => {
    expect(() => defineListSpec({ sort: { keys: { a: { column: "a" } }, default: { key: "b", dir: "asc" } } })).toThrow();
  });
  it("rejects a filter named like a reserved param", () => {
    expect(() =>
      defineListSpec({ sort: { keys: { a: { column: "a" } }, default: { key: "a", dir: "asc" } }, filters: { page: { kind: "bool", column: "x" } } }),
    ).toThrow();
  });
});

describe("sanitizeSearch", () => {
  it("keeps Vietnamese letters, digits, @ . + -", () => {
    expect(sanitizeSearch("  Nguyễn  Văn A 0909-123 a@b.vn ")).toBe("Nguyễn Văn A 0909-123 a@b.vn");
  });
  it("strips PostgREST / SQL syntax characters", () => {
    expect(sanitizeSearch('x"),id.eq.1,(%_*\\;')).toBe("x id.eq.1");
    expect(sanitizeSearch("a,b(c)d:e")).toBe("a b c d e");
  });
  it("caps the length", () => {
    expect(sanitizeSearch("a".repeat(200)).length).toBe(80);
    expect(sanitizeSearch(undefined)).toBe("");
  });
});

describe("isValidDate", () => {
  it("accepts real calendar dates only", () => {
    expect(isValidDate("2026-02-28")).toBe(true);
    expect(isValidDate("2026-02-30")).toBe(false);
    expect(isValidDate("2026-2-3")).toBe(false);
    expect(isValidDate("x")).toBe(false);
  });
});

describe("parseListParams", () => {
  it("returns defaults for empty params", () => {
    expect(parseListParams(spec, {})).toEqual(defaultListState(spec));
    expect(defaultListState(spec)).toMatchObject({ sort: "updated", dir: "desc", page: 1, pageSize: 25 });
  });

  it("reads whitelisted values from a record or URLSearchParams", () => {
    const raw = { q: "an", sort: "code", dir: "asc", status: "quoted,new,bogus,new", owner: "b", active: "0", from: "2026-01-01", to: "2026-01-31", page: "3", size: "50" };
    const s = parseListParams(spec, raw);
    expect(s).toEqual({ q: "an", sort: "code", dir: "asc", filters: { status: ["new", "quoted"], owner: ["b"], active: ["0"] }, from: "2026-01-01", to: "2026-01-31", page: 3, pageSize: 50 });
    expect(parseListParams(spec, new URLSearchParams(raw))).toEqual(s);
  });

  it("drops unknown sort keys, columns and values", () => {
    const s = parseListParams(spec, { sort: "customer_name", dir: "sideways", status: "drop table", owner: "a,b", active: "yes", size: "999", page: "-1" });
    expect(s.sort).toBe("updated");
    expect(s.dir).toBe("desc");
    expect(s.filters).toEqual({ owner: ["a"] }); // single-select keeps the first allowed value
    expect(s.pageSize).toBe(25);
    expect(s.page).toBe(1);
  });

  it("uses the key's first direction when only sort is given", () => {
    expect(parseListParams(spec, { sort: "code" }).dir).toBe("asc");
    expect(parseListParams(spec, { sort: "updated" }).dir).toBe("desc");
  });

  it("takes the first value of repeated params and swaps a reversed date range", () => {
    const s = parseListParams(spec, { q: ["a", "b"], from: "2026-03-10", to: "2026-03-01" });
    expect(s.q).toBe("a");
    expect([s.from, s.to]).toEqual(["2026-03-01", "2026-03-10"]);
  });

  it("ignores prototype keys", () => {
    expect(parseListParams(spec, { sort: "constructor" }).sort).toBe("updated");
    expect(parseListParams(spec, { sort: "__proto__" }).sort).toBe("updated");
  });
});

describe("serializeListParams / listHref", () => {
  it("omits defaults", () => {
    expect(serializeListParams(spec, defaultListState(spec)).toString()).toBe("");
    expect(listHref("/portal", spec, defaultListState(spec))).toBe("/portal");
  });
  it("round-trips", () => {
    const raw = "q=an&status=new%2Cquoted&from=2026-01-01&sort=code&dir=asc&size=50&page=2";
    const s = parseListParams(spec, new URLSearchParams(raw));
    expect(serializeListParams(spec, s).toString()).toBe(raw);
    expect(parseListParams(spec, serializeListParams(spec, s))).toEqual(s);
  });
});

describe("state transitions", () => {
  const base = { ...defaultListState(spec), page: 4 };
  it("patch resets the page unless the page is patched", () => {
    expect(patchListState(base, { q: "x" }).page).toBe(1);
    expect(patchListState(base, { page: 7 }).page).toBe(7);
  });
  it("toggleSort flips the same key and starts a new key at its first direction", () => {
    expect(toggleSort(spec, base, "updated")).toMatchObject({ sort: "updated", dir: "asc", page: 1 });
    expect(toggleSort(spec, base, "name")).toMatchObject({ sort: "name", dir: "asc" });
    expect(toggleSort(spec, base, "nope")).toBe(base);
  });
  it("toggleFilterValue adds/removes (multi) and selects/clears (single)", () => {
    const a = toggleFilterValue(spec, base, "status", "quoted");
    const b = toggleFilterValue(spec, a, "status", "new");
    expect(b.filters.status).toEqual(["new", "quoted"]);
    expect(toggleFilterValue(spec, b, "status", "new").filters.status).toEqual(["quoted"]);
    const c = toggleFilterValue(spec, base, "owner", "a");
    expect(toggleFilterValue(spec, c, "owner", "b").filters.owner).toEqual(["b"]);
    expect(toggleFilterValue(spec, toggleFilterValue(spec, c, "owner", "b"), "owner", "b").filters.owner).toBeUndefined();
    expect(toggleFilterValue(spec, base, "status", "evil")).toBe(base);
    expect(toggleFilterValue(spec, base, "nope", "x")).toBe(base);
  });
  it("clearFilters / hasActiveFilters", () => {
    const s = parseListParams(spec, { q: "a", status: "new", from: "2026-01-01", sort: "code" });
    expect(hasActiveFilters(s)).toBe(true);
    const cleared = clearFilters(s);
    expect(hasActiveFilters(cleared)).toBe(false);
    expect(cleared.sort).toBe("code"); // sort survives
  });
  it("pageCount", () => {
    expect(pageCount(0, 25)).toBe(1);
    expect(pageCount(51, 25)).toBe(3);
  });
});

describe("clampPage / pageSlice (UI-2: ?page past the end)", () => {
  it("clamps to 1..pageCount", () => {
    expect(clampPage(99, 4, 25)).toBe(1);
    expect(clampPage(3, 60, 25)).toBe(3);
    expect(clampPage(5, 60, 25)).toBe(3);
    expect(clampPage(0, 0, 25)).toBe(1);
  });

  it("slices the clamped page", () => {
    const rows = [1, 2, 3, 4, 5];
    expect(pageSlice(rows, { page: 9, pageSize: 2 })).toEqual([5]);
    expect(pageSlice(rows, { page: 2, pageSize: 2 })).toEqual([3, 4]);
    expect(pageSlice([], { page: 4, pageSize: 2 })).toEqual([]);
  });
});
