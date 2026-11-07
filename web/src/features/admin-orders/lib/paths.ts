// Links of the order pages. Printed tape keeps the old URLs; other types add ?type=.
import { ROUTES } from "@/lib/routes";
import type { OrderTab } from "./list-spec";
import type { OrderType } from "./types";

const withType = (path: string, type: OrderType) => (type === "bang_keo_in" ? path : `${path}?type=${type}`);

export const orderHref = (type: OrderType, id: string) => withType(ROUTES.adminOrder(id), type);
export const orderEditHref = (type: OrderType, id: string) => withType(ROUTES.adminOrderEdit(id), type);

export function newOrderHref(type: OrderType, quote = false): string {
  const qs = new URLSearchParams();
  if (type !== "bang_keo_in") qs.set("type", type);
  if (quote) qs.set("quote", "1");
  const s = qs.toString();
  return s ? `${ROUTES.adminOrderNew}?${s}` : ROUTES.adminOrderNew;
}

export const tabHref = (tab: OrderTab) => (tab === "bang_keo_in" ? ROUTES.adminOrders : `${ROUTES.adminOrders}?type=${tab}`);
