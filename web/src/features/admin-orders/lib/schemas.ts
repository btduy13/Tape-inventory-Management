// Zod schemas of the web order forms -> admin_order_create / admin_order_update payloads, and of
// the list / bulk action inputs. Mirrors the SQL checks (order_fields, order_compute: required
// fields, > 0 rules, text lengths, axis rules) so most errors show before the RPC; SQL stays the
// authority and recomputes every amount.
import { z } from "zod";
import { ORDER_TYPES, type OrderType } from "./types";

/** Empty input -> undefined (key left out of the payload), otherwise a finite number >= 0. */
const amount = (max = 1e13) =>
  z.preprocess(
    (v) => (typeof v === "string" ? (v.trim() === "" ? undefined : v.trim().replace(",", ".")) : v),
    z.coerce.number().finite().min(0).max(max).optional(),
  );
const pct = amount(100);
const text = (max: number) =>
  z.preprocess((v) => (typeof v === "string" ? v.trim() || undefined : v), z.string().max(max).optional());
const required = (max: number) => z.string().trim().min(1).max(max);
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const uuid = z.union([z.guid(), z.literal("")]).optional().transform((v) => v || undefined);

/** order_fields '*' (every type). */
const common = {
  ten_hang: required(255),
  ten_khach_hang: required(255),
  sdt_khach_hang: text(30),
  dia_chi_khach_hang: text(500),
  ngay_du_kien: date,
  so_luong: amount(1e9),
  don_gia_ban: amount(),
  vat_percent: pct,
  ctv: text(255),
  hoa_hong: pct,
  tien_ship: amount(),
  customer_id: uuid,
};

type Issue = { code: "custom"; path: string[]; message: string };
type Ctx = { addIssue: (i: Issue) => void };
const positive = (v: Record<string, unknown>, ctx: Ctx, keys: readonly string[], message = "must be > 0") => {
  for (const key of keys) {
    const n = v[key];
    if (!(typeof n === "number" && n > 0)) ctx.addIssue({ code: "custom", path: [key], message });
  }
};

export const orderFormSchema = z
  .object({
    ...common,
    quy_cach_mm: amount(100000),
    quy_cach_m: amount(100000),
    quy_cach_mic: amount(100000),
    cuon_cay: amount(100000),
    phi_sl: amount(),
    mau_keo: text(100),
    phi_keo: amount(),
    mau_sac: text(100),
    phi_mau: amount(),
    phi_size: amount(),
    phi_cat: amount(),
    don_gia_von: amount(),
    tien_coc: amount(),
    loi_giay: text(255),
    thung_bao: text(255),
    loai_truc: z.enum(["cu", "moi"]).default("cu"),
    ten_truc: text(255),
    truc_chu_vi: amount(100000),
    truc_so_luong: amount(1e6),
    truc_gia_goc: amount(),
    truc_gia_ban: amount(),
    truc_vat_percent: pct,
    truc_ctv: text(255),
    truc_hoa_hong: pct,
    workshop_user_id: uuid,
    production_note: text(2000),
  })
  .superRefine((v, ctx) => {
    positive(v, ctx, ["so_luong", "don_gia_ban", "quy_cach_m", "cuon_cay"]);
    if (v.loai_truc === "moi") {
      if (!v.ten_truc) ctx.addIssue({ code: "custom", path: ["ten_truc"], message: "axis" });
      positive(v, ctx, ["truc_so_luong", "truc_gia_goc", "truc_gia_ban"], "axis");
    }
  });

/** Plain tape (bang_keo) and print axis (truc_in): don_gia_goc is required, as in the app. */
const plainShape = { ...common, quy_cach: text(255), mau_sac: text(100), don_gia_goc: amount() };
const plainRefine = (v: Record<string, unknown>, ctx: Ctx) => positive(v, ctx, ["so_luong", "don_gia_ban", "don_gia_goc"]);

export const ORDER_SCHEMAS = {
  bang_keo_in: orderFormSchema,
  bang_keo: z.object(plainShape).superRefine(plainRefine),
  truc_in: z.object({ ...plainShape, mau_keo: text(100) }).superRefine(plainRefine),
  thank_you: z
    .object({ ...common, kich_thuoc: text(255), mau_sac: text(100), don_gia_von: amount(), tien_coc: amount(), ghi_chu: text(2000) })
    .superRefine((v, ctx) => positive(v, ctx, ["so_luong", "don_gia_ban"])),
} as const;

export type OrderFormInput = z.infer<typeof orderFormSchema>;

const AXIS_KEYS = ["ten_truc", "truc_chu_vi", "truc_so_luong", "truc_gia_goc", "truc_gia_ban", "truc_vat_percent", "truc_ctv", "truc_hoa_hong"] as const;
/** Only for a printed-tape order (not a quote): admin_order_create puts them on the job. */
export const WORKSHOP_KEYS = ["workshop_user_id", "production_note"] as const;
/** Fields an order converted from a multi-size quote may still change (admin_order_update). */
export const frozenOrderSchema = z.object({
  ten_hang: common.ten_hang, ten_khach_hang: common.ten_khach_hang, sdt_khach_hang: common.sdt_khach_hang,
  dia_chi_khach_hang: common.dia_chi_khach_hang, ngay_du_kien: common.ngay_du_kien, customer_id: common.customer_id,
});

/**
 * JSON payload for admin_order_create (`clear` false: empty fields left out) or admin_order_update
 * (`clear` true: every form field is sent, empty ones as null so they are cleared). Axis fields only
 * for a new axis; workshop fields never on update.
 */
export function toOrderPayload(input: Record<string, unknown>, clear = false): Record<string, string | number | null> {
  const out: Record<string, string | number | null> = {};
  for (const [key, value] of Object.entries(input)) {
    if (input.loai_truc !== "moi" && (AXIS_KEYS as readonly string[]).includes(key)) continue;
    if (clear && (WORKSHOP_KEYS as readonly string[]).includes(key)) continue;
    if (value === undefined || value === null) {
      if (clear) out[key] = null;
      continue;
    }
    out[key] = value as string | number;
  }
  return out;
}

/** Order ids from next_order_id() and the desktop app (letters, digits, - _ .). */
export const orderIdSchema = z.string().trim().min(1).max(64).regex(/^[\p{L}\p{N}_.-]+$/u);
export const orderTypeSchema = z.enum(ORDER_TYPES);

/** `?type=` of the detail / edit routes; anything else is printed tape (old links). */
export function parseOrderType(raw: unknown): OrderType {
  const r = orderTypeSchema.safeParse(Array.isArray(raw) ? raw[0] : raw);
  return r.success ? r.data : "bang_keo_in";
}

/** Selected orders of a bulk action (the RPCs cap one call at 500 ids). */
export const orderItemsSchema = z.array(z.object({ type: orderTypeSchema, id: orderIdSchema })).min(1).max(500);
export type OrderItem = z.infer<typeof orderItemsSchema>[number];

export const statusSchema = z
  .object({ da_giao: z.boolean().nullable(), da_tat_toan: z.boolean().nullable() })
  .refine((v) => v.da_giao !== null || v.da_tat_toan !== null);

export const isoDateSchema = date.refine((d) => !Number.isNaN(new Date(`${d}T00:00:00Z`).getTime()));
export const optionalUuidSchema = z.union([z.guid(), z.literal(""), z.null()]).transform((v) => v || null);

export const customerCreateSchema = z.object({
  name: required(255),
  phone: text(30),
  address: text(500),
  company: text(255),
});

/** Groups selected orders by type: one RPC call per type. */
export function groupByType(items: readonly OrderItem[]): Map<OrderType, string[]> {
  const out = new Map<OrderType, string[]>();
  for (const { type, id } of items) out.set(type, [...(out.get(type) ?? []), id]);
  return out;
}
