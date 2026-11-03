// Service-role wiring of the public delivery confirmation. Only reachable through the
// rate-limited page and the same-origin-checked route handler.
import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit, type RateLimitRule } from "@/lib/security/rate-limit";
import { scaledMaxHits } from "@/lib/security/rate-limit-scale";
import type { GeneratedDatabase } from "@/lib/types";
import type { DeliveryNoteView, NoteStatus } from "../lib/token";

export const DELIVERY_PHOTO_BUCKET = "delivery-photos";

export const DELIVERY_RATE_LIMITS = {
  /** Page views per IP. */
  view: { name: "delivery-view", windowSeconds: 300, maxHits: 60 },
  /** Photo uploads per IP. */
  confirmIp: { name: "delivery-confirm", windowSeconds: 3600, maxHits: 20 },
  /** Photo uploads per note token (any IP): stops one QR being hammered from many IPs. */
  confirmToken: { name: "delivery-confirm-token", windowSeconds: 3600, maxHits: 10 },
} as const satisfies Record<string, RateLimitRule>;

export type ConfirmError = "not_found" | "already_confirmed" | "replaced" | "not_ready" | "server_error";
export type ConfirmOutcome = { ok: true; confirmedAt: string } | { ok: false; error: ConfirmError };

export interface DeliveryDeps {
  allowIp(headers: Headers, rule: RateLimitRule): Promise<boolean>;
  allowToken(tokenHash: string): Promise<boolean>;
  findNote(tokenHash: string): Promise<DeliveryNoteView | null>;
  upload(path: string, jpeg: Buffer): Promise<boolean>;
  remove(path: string): Promise<void>;
  confirm(tokenHash: string, photoPath: string): Promise<ConfirmOutcome>;
}

// The delivery RPCs are in the generated types; the hand-written Database in lib/types.ts
// does not list them (yet), so these calls use the generated schema directly.
const db = () => createAdminClient() as unknown as SupabaseClient<GeneratedDatabase>;

/** Maps confirm_delivery errors (see migration 0024) to client error codes. */
export function mapConfirmError(err: { code?: string; message?: string }): ConfirmError {
  if (err.code === "P0002") return "not_found";
  if (err.code === "55000") {
    if (err.message?.includes("already confirmed")) return "already_confirmed";
    if (err.message?.includes("replaced")) return "replaced";
    return "not_ready";
  }
  return "server_error";
}

export function createDeliveryDeps(): DeliveryDeps {
  return {
    allowIp: checkRateLimit,
    async allowToken(tokenHash) {
      const rule = DELIVERY_RATE_LIMITS.confirmToken;
      const { data, error } = await db().rpc("check_rate_limit", {
        p_key: `${rule.name}:${tokenHash}`,
        p_window_seconds: rule.windowSeconds,
        p_max_hits: scaledMaxHits(rule.maxHits),
      });
      return !error && data === true;
    },
    async findNote(tokenHash) {
      const { data, error } = await db().rpc("delivery_note_by_token", { p_token_hash: tokenHash });
      const row = !error ? data?.[0] : undefined;
      if (!row) return null;
      return {
        noteId: row.note_id,
        orderName: row.order_name,
        quantity: Number(row.quantity),
        recipientName: row.recipient_name,
        status: row.status as NoteStatus,
        jobReady: row.job_step === "san_sang_giao",
        confirmedAt: row.confirmed_at,
      };
    },
    async upload(path, jpeg) {
      const { error } = await db()
        .storage.from(DELIVERY_PHOTO_BUCKET)
        .upload(path, jpeg, { contentType: "image/jpeg", upsert: false, cacheControl: "private, max-age=0" });
      return !error;
    },
    async remove(path) {
      await db().storage.from(DELIVERY_PHOTO_BUCKET).remove([path]);
    },
    async confirm(tokenHash, photoPath) {
      const { data, error } = await db().rpc("confirm_delivery", {
        p_token_hash: tokenHash,
        p_photo_path: photoPath,
      });
      if (error) return { ok: false, error: mapConfirmError(error) };
      const row = data?.[0];
      return row ? { ok: true, confirmedAt: row.confirmed_at } : { ok: false, error: "server_error" };
    },
  };
}
