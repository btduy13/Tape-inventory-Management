"use client";
// Saved-customer picker of the order form (DB-2 customers). Search by name / company / phone, pick
// to fill the contact fields, or save the typed contact as a new customer. Sends `customer_id`
// (empty = none: the SQL trigger may still link the order by phone).
import Link from "next/link";
import { useEffect, useId, useState, useTransition } from "react";
import { format } from "@/i18n";
import { ROUTES } from "@/lib/routes";
import { InlineStatus } from "@/features/portal-ui/components/States";
import { buttonClass, inputClass, linkClass } from "@/features/portal-ui/components/styles";
import { ordersCopy as c } from "../lib/copy";
import type { CustomerHit } from "../lib/types";
import { createCustomerAction, searchCustomersAction } from "../server/actions";

export type PickedCustomer = { id: string; name: string };

type Props = {
  value: PickedCustomer | null;
  onPick: (customer: CustomerHit) => void;
  onCreate: (customer: PickedCustomer) => void;
  onUnlink: () => void;
  /** Contact typed in the form, used by "Lưu thành khách mới". */
  contact: { name: string; phone: string; address: string };
};

export function CustomerPicker({ value, onPick, onCreate, onUnlink, contact }: Props) {
  const id = useId();
  const [q, setQ] = useState("");
  const [result, setResult] = useState<{ term: string; rows: CustomerHit[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const term = (q.trim() || contact.name.trim()).slice(0, 100);
  const hits = !value && result?.term === term ? result.rows : null;

  useEffect(() => {
    if (value || term.length < 2) return;
    let live = true;
    const timer = setTimeout(() => {
      void searchCustomersAction(term).then((rows) => { if (live) setResult({ term, rows }); });
    }, 300);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [term, value]);

  const create = () => {
    setError(null);
    if (!contact.name.trim()) return setError(c.customerNeedName);
    start(async () => {
      const r = await createCustomerAction({ name: contact.name, phone: contact.phone, address: contact.address });
      if (!r.ok) return setError(r.message);
      onCreate({ id: r.id, name: contact.name.trim() });
    });
  };

  return (
    <div className="flex flex-col gap-2 sm:col-span-2 lg:col-span-3">
      <input type="hidden" name="customer_id" value={value?.id ?? ""} />
      <span className="text-sm font-medium text-pt-text">{c.customer}</span>
      {value ? (
        <div className="flex flex-wrap items-center gap-3 rounded-lg bg-pt-blue-tint px-3 py-2 text-sm text-pt-blue-ink">
          <span className="font-semibold">{format(c.customerChosen, { name: value.name })}</span>
          <Link href={ROUTES.adminCustomer(value.id)} className={linkClass} target="_blank">{c.openCustomer}</Link>
          <button type="button" onClick={onUnlink} className={buttonClass("ghost", "sm", "ml-auto")}>{c.customerUnlink}</button>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-2 sm:flex-row">
            <label htmlFor={id} className="sr-only">{c.customerSearch}</label>
            <input
              id={id} type="search" value={q} onChange={(e) => setQ(e.target.value)}
              placeholder={c.customerSearch} autoComplete="off" maxLength={100} className={inputClass} aria-describedby={`${id}-hint`}
              // Enter would submit the whole order form; with a single hit it picks that customer.
              onKeyDown={(e) => {
                if (e.key !== "Enter") return;
                e.preventDefault();
                if (hits?.length === 1) { onPick(hits[0]); setQ(""); }
              }}
            />
            <button type="button" onClick={create} disabled={pending} className={buttonClass("secondary", "md", "shrink-0")} title={c.customerCreateHint}>
              {c.customerCreate}
            </button>
          </div>
          <p id={`${id}-hint`} className="text-xs text-pt-muted">{c.customerHint}</p>
          <div aria-live="polite" className="sr-only">{hits ? (hits.length === 0 ? c.customerNone : format(c.customerHits, { n: hits.length })) : ""}</div>
          {hits && (
            hits.length === 0 ? <p className="text-sm text-pt-muted">{c.customerNone}</p> : (
              <ul aria-label={c.customerSearch} className="flex flex-col divide-y divide-pt-line rounded-lg border border-pt-line">
                {hits.map((h) => (
                  <li key={h.id}>
                    <button
                      type="button"
                      onClick={() => { onPick(h); setQ(""); }}
                      className="flex min-h-11 w-full flex-col items-start px-3 py-2 text-left text-sm hover:bg-pt-blue-tint/50"
                    >
                      <span className="font-semibold text-pt-text">{h.name}{h.company ? ` · ${h.company}` : ""}</span>
                      <span className="text-xs text-pt-muted">{[h.phone, h.address].filter(Boolean).join(" · ") || "—"}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )
          )}
          {error && <InlineStatus tone="error">{error}</InlineStatus>}
        </>
      )}
    </div>
  );
}
