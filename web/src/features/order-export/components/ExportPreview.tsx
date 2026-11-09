"use client";
// Step 2 + 3 of the export (exportManager.js): edit customer, address, lines and deposit, then the
// printable voucher. "Lưu PDF" and "In chứng từ" both open the browser print dialog (Save as PDF).
import Link from "next/link";
import { useMemo, useState } from "react";
import { buttonClass, inputClass } from "@/features/portal-ui/components/styles";
import { InlineStatus } from "@/features/portal-ui/components/States";
import { DOC_LABEL, DOC_TYPES, exportCopy as c, type CompanyInfo, type DocType } from "../lib/copy";
import { calculateVoucherTotals, editLineNumber, type ExportLine, type VoucherDraft } from "../lib/voucher";
import { VoucherSheet } from "./VoucherSheet";

const vnd = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 });
type Num = "quantity" | "price" | "vat";
type Text = "product" | "specs" | "bg_color" | "text_color" | "unit";
const TEXT_COLS: [Text, string][] = [["product", c.colProduct], ["specs", c.colSpecs], ["bg_color", c.colGlue], ["text_color", c.colColor], ["unit", c.colUnit]];
const NUM_COLS: [Num, string][] = [["quantity", c.colQty], ["price", c.colPrice], ["vat", c.colVat]];
const cellInput = `${inputClass} min-w-24`;

type Props = { draft: VoucherDraft; doc: DocType; company: CompanyInfo; date: string; backHref: string };

export function ExportPreview({ draft, doc: initialDoc, company, date, backHref }: Props) {
  const [doc, setDoc] = useState(initialDoc);
  const [customer, setCustomer] = useState(draft.customer);
  const [address, setAddress] = useState(draft.address);
  const [lines, setLines] = useState<ExportLine[]>(draft.lines);
  const [deposit, setDeposit] = useState(String(draft.deposit));
  // Raw text of a numeric cell while typing ("1." / ""), keyed "row:field".
  const [typing, setTyping] = useState<Record<string, string>>({});
  const [warning, setWarning] = useState<string | null>(null);
  const [printing, setPrinting] = useState(false);
  const totals = useMemo(() => calculateVoucherTotals(lines, deposit), [lines, deposit]);

  const setText = (i: number, field: Text, value: string) =>
    setLines((ls) => ls.map((l, j) => (j === i ? { ...l, [field]: value } : l)));

  function setNumber(i: number, field: Num, value: string) {
    setTyping((t) => {
      const next = { ...t, [`${i}:${field}`]: value };
      if (field !== "vat") delete next[`${i}:vat`]; // VAT follows the new total
      return next;
    });
    const edited = editLineNumber(lines[i], field, value);
    if (edited) setLines((ls) => ls.map((l, j) => (j === i ? edited : l)));
    setWarning(value.trim().startsWith("-") ? c.negative : null);
  }

  function remove(i: number) {
    setLines((ls) => ls.filter((_, j) => j !== i));
    setTyping({});
  }

  const docPills = (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Loại chứng từ">
      {DOC_TYPES.map((d) => (
        <button key={d} type="button" aria-pressed={doc === d} onClick={() => setDoc(d)}
          className={buttonClass(doc === d ? "primary" : "secondary", "sm")}>
          {DOC_LABEL[d]}
        </button>
      ))}
    </div>
  );

  if (printing) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2 print:hidden">
          <button type="button" className={buttonClass("secondary", "sm")} onClick={() => setPrinting(false)}>{c.backToEdit}</button>
          <button type="button" className={buttonClass("secondary", "sm")} onClick={() => window.print()} title={c.pdfHint}>{c.savePdf}</button>
          <button type="button" className={buttonClass("primary", "sm")} onClick={() => window.print()}>{c.print}</button>
        </div>
        <p className="text-sm text-pt-muted print:hidden">{c.pdfHint}</p>
        <VoucherSheet doc={doc} company={company} customer={customer.trim()} address={address.trim()} date={date} lines={lines} totals={totals} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {docPills}
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm font-medium">
          {c.customer}
          <input className={inputClass} value={customer} maxLength={200} onChange={(e) => setCustomer(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          {c.address}
          <input className={inputClass} value={address} maxLength={500} onChange={(e) => setAddress(e.target.value)} />
        </label>
      </div>

      <div className="overflow-x-auto rounded-xl border border-pt-line">
        <table className="w-full min-w-[1100px] text-sm">
          <thead className="bg-pt-grey-tint text-left">
            <tr>
              {[...TEXT_COLS, ...NUM_COLS].map(([k, label]) => <th key={k} className="px-2 py-2 font-semibold">{label}</th>)}
              <th className="px-2 py-2 text-right font-semibold">{c.colTotal}</th>
              <th className="px-2 py-2"><span className="sr-only">{c.remove}</span></th>
            </tr>
          </thead>
          <tbody>
            {lines.length === 0 && (
              <tr><td colSpan={10} className="px-2 py-6 text-center text-pt-muted">{c.noLines}</td></tr>
            )}
            {lines.map((l, i) => (
              <tr key={`${l.id}-${i}`} className="border-t border-pt-line">
                {TEXT_COLS.map(([k, label]) => (
                  <td key={k} className="px-1 py-1">
                    <input aria-label={label} className={cellInput} value={l[k]} onChange={(e) => setText(i, k, e.target.value)} />
                  </td>
                ))}
                {NUM_COLS.map(([k, label]) => (
                  <td key={k} className="px-1 py-1">
                    <input aria-label={label} type="number" min={0} inputMode="decimal" className={`${cellInput} text-right`}
                      value={typing[`${i}:${k}`] ?? String(l[k])} onChange={(e) => setNumber(i, k, e.target.value)}
                      onBlur={() => setTyping((t) => { const next = { ...t }; delete next[`${i}:${k}`]; return next; })} />
                  </td>
                ))}
                <td className="px-2 py-1 text-right font-medium whitespace-nowrap">{vnd.format(l.total)}đ</td>
                <td className="px-1 py-1 text-center">
                  <button type="button" aria-label={`${c.remove} ${l.product}`} className={buttonClass("danger", "sm")} onClick={() => remove(i)}>×</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {warning && <InlineStatus tone="error">{warning}</InlineStatus>}

      <div className="grid gap-3 sm:grid-cols-3">
        <label className="flex flex-col gap-1 text-sm font-medium">
          {c.sum}
          <output className={`${inputClass} bg-pt-grey-tint`}>{vnd.format(totals.subtotal)}đ + VAT {vnd.format(totals.vat)}đ</output>
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          {c.deposit}
          <input className={`${inputClass} text-right`} type="number" min={0} inputMode="numeric" value={deposit}
            onChange={(e) => setDeposit(Number(e.target.value) < 0 ? "0" : e.target.value)} />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          {c.remaining}
          <output className={`${inputClass} bg-pt-grey-tint font-bold`}>{vnd.format(totals.remaining)}đ</output>
        </label>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link href={backHref} className={buttonClass("secondary")}>{c.back}</Link>
        <button type="button" className={buttonClass("primary")} disabled={lines.length === 0}
          onClick={() => { setPrinting(true); window.scrollTo(0, 0); }}>
          {c.makeVoucher}
        </button>
      </div>
      {lines.length === 0 && <InlineStatus tone="error">{c.noProducts}</InlineStatus>}
    </div>
  );
}
