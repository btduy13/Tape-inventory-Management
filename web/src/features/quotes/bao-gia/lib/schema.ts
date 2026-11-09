// Editor state -> admin_quote_save payload (0032). Only the input keys of each type; empty size inputs
// are left out (empty header text is sent: SQL stores null), numbers must be finite and >= 0. SQL re-validates and recomputes every amount.
import { z } from "zod";
import { QUOTE_TYPES, type QuoteType } from "./bundle";

const TEXT = new Set(["quy_cach", "mau_sac", "mau_keo", "loi_giay", "thung_bao", "ctv", "ten_truc", "truc_ctv"]);

export const SIZE_KEYS: Readonly<Record<QuoteType, readonly string[]>> = {
  bang_keo_in: [
    "quy_cach_mm", "quy_cach_m", "quy_cach_mic", "cuon_cay", "so_luong", "mau_keo", "mau_sac", "loi_giay", "thung_bao",
    "don_gia_von", "phi_sl", "phi_keo", "phi_mau", "phi_size", "phi_cat", "don_gia_ban", "vat_percent", "tien_coc",
    "tien_ship", "ctv", "hoa_hong",
  ],
  bang_keo: ["quy_cach", "so_luong", "mau_sac", "don_gia_goc", "don_gia_ban", "vat_percent", "tien_ship", "ctv", "hoa_hong"],
  truc_in: ["quy_cach", "so_luong", "mau_sac", "mau_keo", "don_gia_goc", "don_gia_ban", "vat_percent", "tien_ship", "ctv", "hoa_hong"],
};
export const AXIS_KEYS = ["ten_truc", "truc_chu_vi", "truc_so_luong", "truc_gia_goc", "truc_gia_ban", "truc_vat_percent", "truc_ctv", "truc_hoa_hong"] as const;

const strings = z.record(z.string().max(40), z.string().max(255));
export const quoteInputSchema = z.object({
  type: z.enum(QUOTE_TYPES),
  id: z.string().trim().min(1).max(64).regex(/^[\p{L}\p{N}_.-]+$/u).nullable(),
  header: z.object({
    ten_hang: z.string().trim().min(1).max(255),
    ten_khach_hang: z.string().trim().min(1).max(255),
    sdt_khach_hang: z.string().trim().max(30),
    dia_chi_khach_hang: z.string().trim().max(500),
    customer_id: z.union([z.guid(), z.literal("")]),
  }),
  sizes: z.array(z.object({ fields: strings, axes: z.array(strings).max(20) })).min(1).max(20),
});
export type QuoteInput = z.infer<typeof quoteInputSchema>;

type Json = Record<string, string | number>;

/** Picks `keys` of `src`: text trimmed, numbers parsed ("1,5" ok); empty left out. Null = bad number. */
function pick(src: Record<string, string>, keys: readonly string[]): Json | null {
  const out: Json = {};
  for (const key of keys) {
    const raw = (src[key] ?? "").trim();
    if (!raw) continue;
    if (TEXT.has(key)) out[key] = raw;
    else {
      const n = Number(raw.replace(",", "."));
      if (!Number.isFinite(n) || n < 0) return null;
      out[key] = n;
    }
  }
  return out;
}

export type QuotePayload = { header: Json; items: Record<string, string | number | Json[]>[] };

export function toQuotePayload(input: QuoteInput): QuotePayload | null {
  const { customer_id, ...rest } = input.header;
  const header: Json = { ...rest, ...(customer_id ? { customer_id } : {}) };
  const items: QuotePayload["items"] = [];
  for (const size of input.sizes) {
    const item = pick(size.fields, SIZE_KEYS[input.type]);
    if (!item) return null;
    const axes = input.type === "bang_keo_in" ? size.axes.map((a) => pick(a, AXIS_KEYS)) : [];
    if (axes.some((a) => a === null)) return null;
    items.push({ ...item, ...(axes.length ? { axes: axes as Json[] } : {}) });
  }
  return { header, items };
}
