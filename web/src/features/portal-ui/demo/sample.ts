// Fake rows for the dev-only kit page (/admin/_kit). Not real customers.
import type { LeadStatus } from "@/lib/types";
import { defineListSpec } from "../lib/list-params";

export type DemoLead = {
  id: string; code: string; customer_name: string; phone: string; company: string | null;
  quantity: number; status: LeadStatus; assignee: string | null; updated_at: string;
};

const NAMES = ["Nguyễn Văn An", "Trần Thị Bình", "Lê Minh Châu", "Phạm Quốc Dũng", "Hoàng Gia Hân", "Đặng Thu Hà", "Võ Thành Long", "Bùi Ngọc Mai"];
const STATUSES: LeadStatus[] = ["new", "assigned", "consulting", "quoted", "accepted", "production", "shipping", "done", "cancelled"];
const COMPANIES = ["Công ty Bao Bì Sao Mai", null, "Kho vận Minh Phát", "Shop Gốm Bát Tràng", null];

export const DEMO_LEADS: DemoLead[] = Array.from({ length: 23 }, (_, i) => ({
  id: `demo-${i + 1}`,
  code: `L-2611-${String(i + 1).padStart(3, "0")}`,
  customer_name: NAMES[i % NAMES.length]!,
  phone: `09${String(10_000_000 + i * 731_337).slice(0, 8)}`,
  company: COMPANIES[i % COMPANIES.length]!,
  quantity: 50 * ((i % 7) + 1),
  status: STATUSES[i % STATUSES.length]!,
  assignee: i % 4 === 0 ? null : ["Nhân viên A", "CTV Bình"][i % 2]!,
  updated_at: new Date(Date.UTC(2026, 9, 1 + i, 3, 0)).toISOString(),
}));

export const DEMO_SPEC = defineListSpec({
  sort: {
    keys: {
      updated: { column: "updated_at", firstDir: "desc" },
      code: { column: "code" },
      customer: { column: "customer_name" },
      qty: { column: "quantity", firstDir: "desc" },
    },
    default: { key: "updated", dir: "desc" },
    tiebreak: "id",
  },
  search: { columns: ["code", "customer_name", "phone", "company"] },
  filters: {
    status: { kind: "enum", column: "status", values: STATUSES, multi: true },
    owner: { kind: "enum", column: "assignee", values: ["Nhân viên A", "CTV Bình"] },
  },
  dateRange: { column: "updated_at" },
  pageSizes: [10, 25],
});
