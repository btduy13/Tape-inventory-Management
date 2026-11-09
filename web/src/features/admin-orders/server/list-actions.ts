"use server";
// Server Actions of the order list that need more than the shared actions.ts: Excel import.
// Permission gate + zod here (same form schemas as a form save); SQL re-checks and recomputes money.
import "server-only";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { format } from "@/i18n";
import { hasPerm } from "@/lib/auth/permissions";
import { createClient, getCurrentProfile } from "@/lib/supabase/server";
import { ROUTES } from "@/lib/routes";
import { fieldLabel, ordersCopy as c } from "../lib/copy";
import { IMPORT_TYPES } from "../lib/excel-import";
import { listCopy as l } from "../lib/list-copy";
import { ORDER_SCHEMAS, WORKSHOP_KEYS, toOrderPayload } from "../lib/schemas";
import { importOrders } from "./mutations";

export type ImportResult = { ok: true; message: string } | { ok: false; message: string; errors?: string[] };

const inputSchema = z.object({
  type: z.enum(IMPORT_TYPES),
  rows: z.array(z.object({
    line: z.number().int().min(1).max(100000),
    fields: z.record(z.string().max(40), z.string().max(2000)),
    delivered: z.boolean(),
    settled: z.boolean(),
  })).min(1).max(500),
});

const label = (k: string) => (fieldLabel as Record<string, string>)[k]?.replace(/ \(.*\)$/, "") ?? k;

/** Like the app: every row is checked first, then all rows are saved in one transaction
 *  (admin_orders_import): an error saves nothing, so fixing the file and importing again is safe. */
export async function importOrdersAction(input: unknown): Promise<ImportResult> {
  const profile = await getCurrentProfile();
  if (!hasPerm(profile, "orders.create")) return { ok: false, message: c.errorForbidden };
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: c.errorValidation };
  const { type, rows } = parsed.data;
  // Đã giao / Đã tất toán use the status RPC: say so before anything, not after.
  if (rows.some((r) => r.delivered || r.settled) && !hasPerm(profile, "orders.status")) return { ok: false, message: l.importNeedsStatus };

  const errors: string[] = [];
  const payloads = rows.map((r) => {
    const fields = Object.fromEntries(Object.entries(r.fields).filter(([k]) => !(WORKSHOP_KEYS as readonly string[]).includes(k)));
    const res = ORDER_SCHEMAS[type].safeParse(fields);
    if (res.success) return toOrderPayload(res.data as Record<string, unknown>);
    const axis = res.error.issues.some((i) => i.message === "axis");
    const bad = [...new Set(res.error.issues.map((i) => label(String(i.path[0]))))].join(", ");
    errors.push(format(l.importLine, { line: r.line, reason: axis ? l.importAxis : format(l.importBadFields, { fields: bad }) }));
    return null;
  });
  if (errors.length > 0) return { ok: false, message: l.importErrors, errors: errors.slice(0, 50) };

  const r = await importOrders(await createClient(), type, payloads.map((payload, i) => ({ payload: payload!, delivered: rows[i]!.delivered, settled: rows[i]!.settled })));
  if (!r.ok) {
    const reason = reasonMessage(r.reason);
    return { ok: false, message: r.row ? format(l.importStopped, { line: rows[r.row - 1]?.line ?? r.row, reason }) : reason };
  }
  revalidatePath(ROUTES.adminOrders, "layout");
  revalidatePath(ROUTES.workshop);
  return { ok: true, message: format(l.importDone, { done: r.count, count: rows.length }) };
}

function reasonMessage(reason: "forbidden" | "invalid" | "notFound" | "generic"): string {
  return { forbidden: c.errorForbidden, invalid: c.errorValidation, notFound: c.errorNotFound, generic: c.errorGeneric }[reason];
}
