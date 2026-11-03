// Data for the public /giao/<token> page (rate limited per IP). Exposes only order name,
// quantity, recipient name and state: never prices, phone or address.
import "server-only";
import { hashDeliveryToken, isDeliveryToken, noteAccess, type DeliveryNoteView, type NoteAccess } from "../lib/token";
import { createDeliveryDeps, DELIVERY_RATE_LIMITS, type DeliveryDeps } from "./deps";

export type LoadNoteResult =
  | { access: "rate_limited" }
  | { access: "invalid" }
  | { access: NoteAccess; note: DeliveryNoteView };

export async function loadDeliveryNote(
  rawToken: string,
  headers: Headers,
  deps: () => DeliveryDeps = createDeliveryDeps,
): Promise<LoadNoteResult> {
  const d = deps();
  if (!(await d.allowIp(headers, DELIVERY_RATE_LIMITS.view))) return { access: "rate_limited" };
  if (!isDeliveryToken(rawToken)) return { access: "invalid" };
  const note = await d.findNote(await hashDeliveryToken(rawToken));
  if (!note) return { access: "invalid" };
  return { access: noteAccess(note), note };
}
