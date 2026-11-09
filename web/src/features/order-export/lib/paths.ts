// Links into the export / email pages (list bulk action, row menu "Xem & In phiếu giao hàng", email).
import { ROUTES } from "@/lib/routes";
import type { OrderType } from "@/features/admin-orders/lib/types";
import type { DocType } from "./copy";

export const EXPORT_PATH = `${ROUTES.adminOrders}/xuat`;

/** No ids: the order picker. With ids: straight to the preview (app's single-order shortcut). */
export const exportHref = (ids: readonly string[] = [], doc: DocType = "don_dat_hang") =>
  ids.length ? `${EXPORT_PATH}?ids=${ids.map(encodeURIComponent).join(",")}&doc=${doc}` : `${EXPORT_PATH}?doc=${doc}`;

export const emailHref = (type: OrderType, id: string) => `${EXPORT_PATH}/email?type=${type}&id=${encodeURIComponent(id)}`;
