"use client";
// "Kích thước và giá": one tab per size (× closes, min 1), "+ Thêm kích thước", fields of the open size.
import { inputClass } from "@/features/portal-ui/components/styles";
import { fieldLabel, type FieldKey } from "@/features/admin-orders/lib/copy";
import type { Fields, QuoteType, SizeDraft } from "../lib/bundle";
import { SIZE_KEYS } from "../lib/schema";

const TEXT = new Set(["quy_cach", "mau_sac", "mau_keo", "loi_giay", "thung_bao", "ctv"]);

export const labelOf = (key: string) => (key === "vat_percent" ? "VAT tổng báo giá (%)" : fieldLabel[key as FieldKey] ?? key);

export function sizeLabel(type: QuoteType, f: Fields, index: number): string {
  if (type === "bang_keo_in" && (f.quy_cach_mm || f.quy_cach_m)) return `${f.quy_cach_mm || "-"}mm × ${f.quy_cach_m || "-"}m`;
  return f.quy_cach?.trim() || `Kích thước ${index + 1}`;
}

type Props = {
  type: QuoteType;
  sizes: SizeDraft[];
  active: number;
  onSelect: (i: number) => void;
  onAdd: () => void;
  onRemove: (i: number) => void;
  onChange: (key: string, value: string) => void;
};

export function SizeFields({ type, sizes, active, onSelect, onAdd, onRemove, onChange }: Props) {
  const f = sizes[active]?.fields ?? {};
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label="Kích thước">
        {sizes.map((s, i) => (
          <span key={i} className={`inline-flex min-h-11 items-center rounded-lg border ${i === active ? "border-vt-blue bg-pt-blue-tint" : "border-pt-line-strong bg-pt-surface"}`}>
            <button type="button" role="tab" aria-selected={i === active} onClick={() => onSelect(i)} className="min-h-11 px-3 text-sm font-semibold text-pt-text">
              {sizeLabel(type, s.fields, i)}
            </button>
            {sizes.length > 1 && (
              <button type="button" onClick={() => onRemove(i)} aria-label={`Bỏ ${sizeLabel(type, s.fields, i)}`} className="min-h-11 px-3 text-pt-muted hover:text-pt-red-ink">×</button>
            )}
          </span>
        ))}
        <button type="button" onClick={onAdd} className="min-h-11 rounded-lg border border-dashed border-pt-line-strong px-3 text-sm font-semibold text-vt-blue">
          + Thêm kích thước
        </button>
        <span className="text-sm text-pt-muted">{sizes.length} kích thước</span>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {SIZE_KEYS[type].map((key) => (
          <label key={key} className="flex flex-col gap-1.5 text-sm font-medium text-pt-text">
            {labelOf(key)}
            <input
              className={inputClass}
              value={f[key] ?? ""}
              inputMode={TEXT.has(key) ? undefined : "decimal"}
              onChange={(e) => onChange(key, e.target.value)}
            />
          </label>
        ))}
      </div>
    </div>
  );
}
