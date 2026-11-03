// Delivery note QR tokens: 43-char base64url raw token (QR only), sha256 hex stored in DB.
import { z } from "zod";
import { sha256Hex } from "@/lib/security/hash";

/** create_delivery_note returns 256 random bits as unpadded base64url = 43 chars. */
export const deliveryTokenSchema = z.string().regex(/^[A-Za-z0-9_-]{43}$/);

export const isDeliveryToken = (raw: string) => deliveryTokenSchema.safeParse(raw).success;

export const hashDeliveryToken = (raw: string) => sha256Hex(raw);

export type NoteStatus = "open" | "confirmed" | "revoked";

export interface DeliveryNoteView {
  noteId: string;
  orderName: string;
  quantity: number;
  recipientName: string;
  status: NoteStatus;
  /** Job is at san_sang_giao: only then can an open note be confirmed. */
  jobReady: boolean;
  confirmedAt: string | null;
}

/** What the page may do with a note: capture a photo, or show one of the end states. */
export type NoteAccess = "capture" | "confirmed" | "replaced" | "not_ready";

export function noteAccess(note: Pick<DeliveryNoteView, "status" | "jobReady">): NoteAccess {
  if (note.status === "confirmed") return "confirmed";
  if (note.status === "revoked") return "replaced";
  return note.jobReady ? "capture" : "not_ready";
}
