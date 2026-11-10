// Public API of features/orders (server consumers: pages, layouts, admin feature).
export { LeadDetailView } from "./components/LeadDetailView";
export { LeadList } from "./components/LeadList";
export { ProductionSlot } from "./components/ProductionSlot";
export { UnreadBadge } from "./components/UnreadBadge";
export { loadLeadDetail, loadLeadListPage, type LeadListData } from "./server/load";
export type { LeadDetail, QuoteSummary } from "./server/queries";
export type { LeadRow } from "./lib/lead-list";
export { formatDateTime } from "./lib/timeline";
