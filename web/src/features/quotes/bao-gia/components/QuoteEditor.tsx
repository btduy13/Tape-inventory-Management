"use client";
// Quote form of /admin/bao-gia/moi: shared customer fields, several sizes, several axes per size
// (printed tape), live bundle totals. Save -> admin_quote_save -> print page (the app's
// "Lưu toàn bộ & Xem trước PDF").
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { Section } from "@/features/portal-ui/components/Section";
import { InlineStatus } from "@/features/portal-ui/components/States";
import { buttonClass, inputClass } from "@/features/portal-ui/components/styles";
import { money } from "@/features/admin-orders/lib/format";
import { number } from "@/features/admin-orders/lib/order-math";
import { buildItem, isNewAxis, numericFields, quoteBundle, quoteError, sizeResults, type Fields, type QuoteType, type SizeDraft } from "../lib/bundle";
import { AXIS_KEYS, type QuoteInput } from "../lib/schema";
import { saveQuoteAction } from "../server/actions";
import { quotePrintHref } from "../lib/paths";
import { AxisPanel } from "./AxisPanel";
import { SizeFields } from "./SizeFields";

export type EditorHeader = QuoteInput["header"];
type Props = { type: QuoteType; id: string | null; header: EditorHeader; sizes: SizeDraft[]; money: boolean };

const HEADER: [keyof EditorHeader, string, boolean][] = [
  ["ten_hang", "Tên hàng", true], ["ten_khach_hang", "Tên khách hàng", true],
  ["sdt_khach_hang", "SĐT khách", false], ["dia_chi_khach_hang", "Địa chỉ giao", false],
];
const emptyAxis = (): Fields => ({ truc_gia_goc: "", truc_gia_ban: "", truc_vat_percent: "" });
const axisFilled = (a: Fields) => AXIS_KEYS.some((k) => (a[k] ?? "").trim() !== "");
const axisComplete = (typed: Fields) => {
  const a = numericFields(typed);
  return !!a.ten_truc?.trim() && number(a.truc_so_luong) > 0 && number(a.truc_gia_goc) > 0 && number(a.truc_gia_ban) > 0;
};

export function QuoteEditor({ type, id, header: initialHeader, sizes: initialSizes, money: showMoney }: Props) {
  const router = useRouter();
  const [header, setHeader] = useState(initialHeader);
  const [sizes, setSizes] = useState<SizeDraft[]>(initialSizes.length ? initialSizes : [{ fields: {}, axes: [] }]);
  const [active, setActive] = useState(0);
  const [axis, setAxis] = useState<Fields>(emptyAxis);
  const [axisError, setAxisError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const items = useMemo(() => sizes.map((s) => buildItem(type, s)), [sizes, type]);
  const totals = useMemo(() => quoteBundle(items), [items]);
  const open = sizes[Math.min(active, sizes.length - 1)]!; // there is always at least one size
  const newAxis = isNewAxis(type, open);
  const results = useMemo(() => sizeResults(type, open, axis), [type, open, axis]);

  const patchSize = (i: number, patch: (s: SizeDraft) => SizeDraft) => setSizes((all) => all.map((s, j) => (j === i ? patch(s) : s)));
  const addSize = () => {
    // Copies the open size except its axes; deposit back to 0, Trục cũ (quotations.js:409-432).
    setSizes((all) => [...all, { fields: { ...all[active]!.fields, tien_coc: "0", ...(type === "bang_keo_in" ? { loai_truc: "cu" } : {}) }, axes: [] }]);
    setActive(sizes.length);
  };
  const removeSize = (i: number) => {
    setSizes((all) => all.filter((_, j) => j !== i));
    setActive((a) => Math.max(0, a >= i ? a - 1 : a));
  };
  const addAxis = () => {
    if (!axisComplete(axis)) return setAxisError("Trục cần đủ tên, số lượng, giá gốc và giá bán lớn hơn 0");
    setAxisError(null);
    patchSize(active, (s) => ({ ...s, axes: [...s.axes, axis] }));
    setAxis(emptyAxis());
  };

  const setAxisMode = (on: boolean) => {
    // Trục cũ drops the typed and the saved axes of the size, as setBangKeoInAxisMode does.
    if (!on && open.axes.length > 0 && !window.confirm(`Chuyển sang trục cũ sẽ xóa ${open.axes.length} trục đã thêm của kích thước này. Tiếp tục?`)) return;
    patchSize(active, (s) => ({ fields: { ...s.fields, loai_truc: on ? "moi" : "cu" }, axes: on ? s.axes : [] }));
    if (!on) {
      setAxis(emptyAxis());
      setAxisError(null);
    }
  };

  const save = () => {
    setError(null);
    // A filled "Trục đang nhập" counts as an axis of the open size with Trục mới, like axisFromFields.
    let all = sizes;
    if (newAxis && axisFilled(axis)) {
      if (!axisComplete(axis)) return setError("Mỗi trục cần đủ tên, số lượng, giá gốc và giá bán");
      all = sizes.map((s, j) => (j === active ? { ...s, axes: [...s.axes, axis] } : s));
    }
    const problem = quoteError(type, all.map((s) => buildItem(type, s)), all);
    if (problem) return setError(problem);
    start(async () => {
      const r = await saveQuoteAction({ type, id, header, sizes: all });
      if (!r.ok) return setError(r.message);
      router.push(quotePrintHref(type, r.id));
    });
  };

  return (
    <div className="flex flex-col gap-4">
      {id && <InlineStatus tone="info">Mã {id} · mọi thay đổi sẽ ghi đè báo giá này</InlineStatus>}
      <Section title="Thông tin khách hàng">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {HEADER.map(([key, label, required]) => (
            <label key={key} className="flex flex-col gap-1.5 text-sm font-medium text-pt-text">
              <span>{label}{required && <span className="text-pt-red-ink" aria-hidden> *</span>}</span>
              <input className={inputClass} required={required} value={header[key]} onChange={(e) => setHeader({ ...header, [key]: e.target.value })} />
            </label>
          ))}
        </div>
      </Section>
      <Section title="Kích thước và giá">
        <SizeFields
          type={type} sizes={sizes} active={active} results={results} money={showMoney}
          onSelect={setActive} onAdd={addSize} onRemove={removeSize} onAxisMode={setAxisMode}
          onChange={(key, value) => patchSize(active, (s) => ({ ...s, fields: { ...s.fields, [key]: value } }))}
        />
      </Section>
      {newAxis && (
        <Section title="Trục đang nhập" description="Trục in mới của kích thước đang mở">
          <AxisPanel
            draft={axis} saved={open.axes} error={axisError} money={showMoney}
            onDraft={(key, value) => setAxis((a) => ({ ...a, [key]: value }))}
            onAdd={addAxis}
            onEdit={(i) => {
              setAxis(sizes[active]!.axes[i]!);
              patchSize(active, (s) => ({ ...s, axes: s.axes.filter((_, j) => j !== i) }));
            }}
            onRemove={(i) => patchSize(active, (s) => ({ ...s, axes: s.axes.filter((_, j) => j !== i) }))}
          />
        </Section>
      )}
      <Section title="Tổng báo giá">
        <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
          <Row label="Tiền hàng" value={totals.productSubtotal} />
          <Row label="VAT" value={totals.vat} />
          {type === "bang_keo_in" && <Row label={`Trục (${totals.axisCount}) gồm VAT`} value={totals.axisSubtotal + totals.axisVat} />}
          {type === "bang_keo_in" && <Row label="Đặt cọc" value={totals.deposit} />}
          {showMoney && <Row label="Tổng giá vốn" value={totals.costTotal + totals.axisCostTotal} />}
          <Row label="Công nợ khách" value={totals.remaining} strong />
        </dl>
      </Section>
      {error && <InlineStatus tone="error">{error}</InlineStatus>}
      <div className="flex flex-wrap gap-3">
        <button type="button" onClick={save} disabled={pending} className={buttonClass("primary")}>
          {pending ? "Đang lưu…" : id ? "Cập nhật & Xem trước PDF" : "Lưu toàn bộ & Xem trước PDF"}
        </button>
      </div>
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: number; strong?: boolean }) {
  return (
    <div className="flex justify-between gap-3 border-b border-pt-line py-1.5">
      <dt className="text-pt-muted">{label}</dt>
      <dd className={`tabular-nums ${strong ? "font-bold text-pt-text" : "text-pt-text"}`}>{money(value)}</dd>
    </div>
  );
}
