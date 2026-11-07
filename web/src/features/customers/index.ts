// Public API of features/customers (server consumers: /admin/khach-hang pages).
// Admin only: every view shows sales, debt and customer contacts.
export { CustomersView } from "./components/CustomersView";
export { CustomerDetailView } from "./components/CustomerDetailView";
export { ReviewView } from "./components/ReviewView";
export { customerIdSchema } from "./lib/schemas";
