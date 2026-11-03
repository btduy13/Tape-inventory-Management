// Zod schema of the web order form -> admin_order_create payload. Mirrors the SQL checks
// (required fields, > 0 rules, text lengths, axis rules) so most errors show before the RPC;
// SQL stays the authority and recomputes every amount.
import { z } from "zod";

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

export const orderFormSchema = z
  .object({
    ten_hang: required(255),
    ten_khach_hang: required(255),
    sdt_khach_hang: text(30),
    dia_chi_khach_hang: text(500),
    ngay_du_kien: date,
    quy_cach_mm: amount(100000),
    quy_cach_m: amount(100000),
    quy_cach_mic: amount(100000),
    cuon_cay: amount(100000),
    so_luong: amount(1e9),
    phi_sl: amount(),
    mau_keo: text(100),
    phi_keo: amount(),
    mau_sac: text(100),
    phi_mau: amount(),
    phi_size: amount(),
    phi_cat: amount(),
    don_gia_von: amount(),
    don_gia_ban: amount(),
    tien_coc: amount(),
    vat_percent: pct,
    ctv: text(255),
    hoa_hong: pct,
    tien_ship: amount(),
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
    for (const key of ["so_luong", "don_gia_ban", "quy_cach_m", "cuon_cay"] as const) {
      if (!(v[key] && v[key] > 0)) ctx.addIssue({ code: "custom", path: [key], message: "must be > 0" });
    }
    if (v.loai_truc === "moi") {
      if (!v.ten_truc) ctx.addIssue({ code: "custom", path: ["ten_truc"], message: "axis" });
      for (const key of ["truc_so_luong", "truc_gia_goc", "truc_gia_ban"] as const) {
        if (!(v[key] && v[key] > 0)) ctx.addIssue({ code: "custom", path: [key], message: "axis" });
      }
    }
  });

export type OrderFormInput = z.infer<typeof orderFormSchema>;

const AXIS_KEYS = ["ten_truc", "truc_chu_vi", "truc_so_luong", "truc_gia_goc", "truc_gia_ban", "truc_vat_percent", "truc_ctv", "truc_hoa_hong"] as const;

/** JSON payload for admin_order_create: numbers as JSON numbers, empty fields left out,
 *  axis fields only for a new axis (the RPC rejects unknown keys, not extra axis keys). */
export function toOrderPayload(input: OrderFormInput): Record<string, string | number> {
  const out: Record<string, string | number> = {};
  for (const [key, value] of Object.entries(input)) {
    if (value === undefined || value === null) continue;
    if (input.loai_truc !== "moi" && (AXIS_KEYS as readonly string[]).includes(key)) continue;
    out[key] = value as string | number;
  }
  return out;
}

/** Order ids from next_bang_keo_in_order_id() and the desktop app (letters, digits, - _ .). */
export const orderIdSchema = z.string().trim().min(1).max(64).regex(/^[\p{L}\p{N}_.-]+$/u);
