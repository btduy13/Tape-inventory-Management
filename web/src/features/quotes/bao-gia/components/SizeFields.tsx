"use client";
// "Kích thước và giá": one tab per size (× closes, min 1), "+ Thêm kích thước", then the open size as in
// the app's quote form: "Kê khai" input groups and the read-only "Kết quả tính toán".
import { inputClass } from "@/features/portal-ui/components/styles";
import { AxisSwitch } from "@/features/admin-orders/components/AxisSwitch";
import { fieldLabel, type FieldKey } from "@/features/admin-orders/lib/copy";
import { visibleFields } from "@/features/admin-orders/lib/form-layout";
import { formatMoneyInput } from "@/features/admin-orders/lib/form-money";
import { TEXT_KEYS, type Fields, type QuoteType, type SizeDraft } from "../lib/bundle";
import { SIZE_GROUPS, SIZE_REQUIRED, SIZE_RESULTS, type InputGroup } from "../lib/layout";

export const labelOf = (key: string) => (key === "vat_percent" ? "VAT tổng báo giá (%)" : fieldLabel[key as FieldKey] ?? key);
const sizeLabelOf = (type: QuoteType, key: string) => (type === "bang_keo" && key === "quy_cach" ? "Quy cách (KG)" : labelOf(key));

export function sizeLabel(type: QuoteType, f: Fields, index: number): string {
  if (type === "bang_keo_in" && (f.quy_cach_mm || f.quy_cach_m)) return `${f.quy_cach_mm || "-"}mm × ${f.quy_cach_m || "-"}m`;
  return f.quy_cach?.trim() || `Kích thước ${index + 1}`;
}

/** Input groups of the app ("Kê khai"); `axisSwitch` closes the group marked axisSwitch. */
export function InputGroups({ groups, values, label, required, onChange, axisSwitch }: {
  groups: readonly InputGroup[];
  values: Fields;
  label: (key: string) => string;
  required?: ReadonlySet<string>;
  onChange: (key: string, value: string) => void;
  axisSwitch?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4">
      {groups.map((g) => (
        <fieldset key={g.title} className="flex flex-col gap-3 rounded-xl border border-pt-line p-3 sm:p-4">
          <legend className="px-1 text-sm font-semibold text-pt-text">{g.title}</legend>
          <p className="-mt-2 text-xs text-pt-muted">{g.description}</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {g.keys.map((key) => (
              <label key={key} className="flex flex-col gap-1.5 text-sm font-medium text-pt-text">
                <span>{label(key)}{required?.has(key) && <span className="text-pt-red-ink" aria-hidden> *</span>}</span>
                <input
                  className={inputClass}
                  value={values[key] ?? ""}
                  required={required?.has(key)}
                  inputMode={TEXT_KEYS.has(key) ? undefined : "decimal"}
                  onChange={(e) => onChange(key, e.target.value)}
                />
              </label>
            ))}
            {g.axisSwitch && axisSwitch}
          </div>
        </fieldset>
      ))}
    </div>
  );
}

/** Read-only computed values ("Kết quả tính toán"); costs, commission and profit need orders.money. */
export function Results({ title, description, keys, values, money }: {
  title: string; description: string; keys: readonly FieldKey[]; values: Readonly<Record<string, number>>; money: boolean;
}) {
  const shown = visibleFields(keys.map((k) => [k, "calc"] as const), money);
  if (shown.length === 0) return null;
  return (
    <section aria-label={title} className="flex flex-col gap-3 rounded-xl bg-pt-canvas p-3 sm:p-4">
      <div>
        <h3 className="text-sm font-semibold text-pt-text">{title}</h3>
        <p className="text-xs text-pt-muted">{description}</p>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map(([key]) => (
          <label key={key} className="flex flex-col gap-1.5 text-sm font-medium text-pt-text">
            {labelOf(key)}
            <input
              readOnly tabIndex={-1}
              className={`${inputClass} bg-pt-surface! tabular-nums ${key === "loi_nhuan_rong" || key === "truc_loi_nhuan_rong" ? "font-bold text-pt-green-ink" : ""}`}
              value={formatMoneyInput(String(values[key] ?? 0))}
            />
          </label>
        ))}
      </div>
    </section>
  );
}

type Props = {
  type: QuoteType;
  sizes: SizeDraft[];
  active: number;
  /** sizeResults of the open size. */
  results: Readonly<Record<string, number>>;
  /** orders.money: may see costs, commission and profit, as in the order form. */
  money: boolean;
  onSelect: (i: number) => void;
  onAdd: () => void;
  onRemove: (i: number) => void;
  onChange: (key: string, value: string) => void;
  onAxisMode: (newAxis: boolean) => void;
};

export function SizeFields({ type, sizes, active, results, money, onSelect, onAdd, onRemove, onChange, onAxisMode }: Props) {
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
      <InputGroups
        groups={SIZE_GROUPS[type]} values={f} label={(key) => sizeLabelOf(type, key)} required={SIZE_REQUIRED[type]} onChange={onChange}
        axisSwitch={<AxisSwitch checked={f.loai_truc === "moi"} onChange={onAxisMode} />}
      />
      <Results title="Kết quả tính toán" description="Các giá trị này tự cập nhật từ phần kê khai." keys={SIZE_RESULTS[type]} values={results} money={money} />
    </div>
  );
}
