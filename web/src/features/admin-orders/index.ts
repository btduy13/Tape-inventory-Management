// Public API of features/admin-orders (server consumers: /admin/don-hang pages).
// Admin only: every view shows prices, costs, profit and customer contacts.
export { OrdersView } from "./components/OrdersView";
export { NewOrderView } from "./components/NewOrderView";
export { EditOrderView } from "./components/EditOrderView";
export { OrderDetailView } from "./components/OrderDetailView";
export { orderIdSchema, parseOrderType } from "./lib/schemas";
