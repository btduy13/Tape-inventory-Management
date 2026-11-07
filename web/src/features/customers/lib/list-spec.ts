// URL params of the customer lists. Search and paging run in SQL; order is fixed there
// (latest order first), so the single sort key is never shown as a header.
import { defineListSpec, type ListState } from "@/features/portal-ui/lib/list-params";

export const CUSTOMERS_SPEC = defineListSpec({
  sort: { keys: { last: { column: "last_order_at", firstDir: "desc" } }, default: { key: "last", dir: "desc" } },
  search: { columns: ["name", "company", "phone"] },
  pageSizes: [25, 50, 100],
});

export const pageArgs = (state: ListState) => ({ p_limit: state.pageSize, p_offset: (state.page - 1) * state.pageSize });
