// Public API of features/orders (server consumers: pages, layouts, admin feature).
export { LeadDetailView } from "./components/LeadDetailView";
export { LeadList } from "./components/LeadList";
export { LeadOverview } from "./components/LeadOverview";
export { ProductionSlot } from "./components/ProductionSlot";
export { UnreadBadge } from "./components/UnreadBadge";
export { loadLeadDetail, loadLeadListPage, loadOverview, type LeadListData } from "./server/load";
export type { LeadDetail, QuoteSummary } from "./server/queries";
export type { LeadRow } from "./lib/lead-list";
export { formatDateTime } from "./lib/timeline";
