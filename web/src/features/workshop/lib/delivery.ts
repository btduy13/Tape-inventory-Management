// Delivery note (phiếu giao hàng) shaping. Pure: the server action creates the note
// (create_delivery_note, 0024) and passes the result through here before it reaches the browser.
import { ROUTES } from "@/lib/routes";
import type { AppRole, DeliveryNoteCreated } from "@/lib/types";

/** What the printed note shows. `orderId` only for admin: the workshop never sees codes. */
export type PrintableNote = {
  noteId: string;
  orderName: string;
  orderId: string | null;
  quantity: number;
  width_mm: number | null;
  length_m: number | null;
  thickness_mic: number | null;
  colors: string[] | null;
  printText: string | null;
  dueDate: string | null;
  recipientName: string | null;
  recipientPhone: string | null;
  recipientAddress: string | null;
  createdAt: string;
};

/** Absolute URL of the public confirm page (what the QR encodes). */
export function deliveryConfirmUrl(siteUrl: string, token: string): string {
  return new URL(ROUTES.deliveryConfirm(token), siteUrl).toString();
}

/** Drops the raw token (only the QR carries it) and, for non-admins, the order code. */
export function toPrintableNote(row: DeliveryNoteCreated, role: AppRole, fallbackName: string): PrintableNote {
  const clean = (v: string | null) => v?.trim() || null;
  return {
    noteId: row.note_id,
    orderName: clean(row.order_name) ?? fallbackName,
    orderId: role === "admin" ? row.order_id : null,
    quantity: row.quantity,
    width_mm: row.width_mm,
    length_m: row.length_m,
    thickness_mic: row.thickness_mic,
    colors: row.colors,
    printText: clean(row.print_text),
    dueDate: row.due_date,
    recipientName: clean(row.recipient_name),
    recipientPhone: clean(row.recipient_phone),
    recipientAddress: clean(row.recipient_address),
    createdAt: row.created_at,
  };
}
