// Public API of features/delivery (QR delivery confirmation, no login).
export { DeliveryPage } from "./components/delivery-page";
export { deliveryCopy } from "./lib/copy";
// Route handler logic for POST /api/giao/[token]
export { handleConfirmRequest } from "./server/confirm-route";
