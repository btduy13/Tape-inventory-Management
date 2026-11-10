"use client";
// Web order form for the 4 order types, laid out like the app form (electron/index.html): card
// "Thông tin cơ bản", for printed tape a "Có trục mới" switch that opens "Thông tin Trục mới", then
// "Giá và Chi phí" with the computed values inline (read-only). Create (order or quote) and edit.
// Inputs are controlled so a failed save keeps what was typed. The server action validates with
// zod; SQL recomputes every amount.
import { Fragment, useActionState, useEffect, useId, useMemo, useState, useTransition } from "react";
import { format } from "@/i18n";
import { Field, SelectField, TextareaField, TextField } from "@/features/portal-ui/components/Field";
import { ActionStatus, InlineStatus } from "@/features/portal-ui/components/States";
import { buttonClass, inputClass, surfaceClass } from "@/features/portal-ui/components/styles";
import type { WorkshopUser } from "@/features/workshop/server/queries";
import { fieldLabel as f, ordersCopy as c } from "../lib/copy";
import { AXIS_FIELDS, AXIS_REQUIRED, BASIC_FIELDS, COST_INPUTS, PRICE_FIELDS, priceGroups, requiredFor, visibleFields, type FieldSpec } from "../lib/form-layout";
import { formatMoneyInput } from "../lib/form-money";
import { formCalc, orderTotals } from "../lib/form-totals";
import type { CustomerHit, OrderType } from "../lib/types";
import {
  createOrderAction, latestOrderAction, suggestNamesAction, updateOrderAction, type OrderActionState,
} from "../server/actions";
import { CustomerPicker, type PickedCustomer } from "./CustomerPicker";
import { MoneyField } from "./MoneyField";
import { OrderTotals } from "./OrderTotals";

const IDLE: OrderActionState = { status: "idle" };

type Props = {
  type: OrderType;
  mode: "create" | "edit";
  isQuote?: boolean;
  orderId?: string;
  /** Order from a multi-size quote: only name, customer and due date can change (money frozen). */
  frozen?: boolean;
  /** orders.money: false hides costs, fees, CTV, commission and profit (the RPCs return null). */
  money?: boolean;
  initial: Record<string, string>;
  initialCustomer: PickedCustomer | null;
  workshopUsers: WorkshopUser[];
};

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className={`${surfaceClass} min-w-0 p-4 sm:p-5`}>
      <legend className="float-left mb-4 w-full text-base font-semibold text-pt-text">{title}</legend>
      <div className="clear-both grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
    </fieldset>
  );
}

export function OrderForm({ type, mode, isQuote = false, orderId, frozen = false, money = true, initial, initialCustomer, workshopUsers }: Props) {
  const [state, action, pending] = useActionState(mode === "edit" ? updateOrderAction : createOrderAction, IDLE);
  const [values, setValues] = useState<Record<string, string>>(initial);
  const [customer, setCustomer] = useState<PickedCustomer | null>(initialCustomer);
  const [names, setNames] = useState<string[]>([]);
  const [copyNote, setCopyNote] = useState<{ tone: "success" | "info"; text: string } | null>(null);
  const [copying, startCopy] = useTransition();
  const listId = useId();
  const totals = useMemo(() => orderTotals(type, values), [type, values]);
  const calc = useMemo(() => formCalc(type, values), [type, values]);
  const axis = type === "bang_keo_in" && values.loai_truc === "moi";
  const bad = new Set(state.status === "error" ? state.fields ?? [] : []);
  const required = requiredFor(type);
  const name = values.ten_hang ?? "";

  // Product-name suggestions (admin_order_name_suggest), debounced.
  useEffect(() => {
    if (frozen || name.trim().length < 2) return;
    let live = true;
    const timer = setTimeout(() => void suggestNamesAction(type, name).then((r) => live && setNames(r)), 300);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [frozen, name, type]);

  const setValue = (key: string, value: string) => setValues((v) => ({ ...v, [key]: value }));
  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setValue(key, e.target.value);
  const errorOf = (key: string) => (bad.has(key) ? c.errorValidation : null);

  const field = ([key, kind, max]: FieldSpec) => {
    if (kind === "calc") {
      // Read-only result like the app's readonly inputs: no name, never submitted (SQL recomputes it).
      const n = calc[key] ?? 0;
      const tone = n < 0 ? "text-pt-red-ink" : key.endsWith("loi_nhuan_rong") ? "font-semibold text-pt-green-ink" : "";
      return (
        <Field key={key} label={f[key]}>
          {({ id }) => <input id={id} readOnly tabIndex={-1} value={formatMoneyInput(String(n))} className={`${inputClass} bg-pt-canvas! tabular-nums ${tone}`} />}
        </Field>
      );
    }
    // Without orders.money the stored cost is hidden (null): empty keeps it (updateOrderAction + SQL).
    const keepsCost = mode === "edit" && !money && (COST_INPUTS as readonly string[]).includes(key);
    const props = {
      name: key, label: f[key], required: !keepsCost && (required.has(key) || (axis && AXIS_REQUIRED.has(key))), error: errorOf(key),
      ...(keepsCost ? { hint: c.costKeptHint } : {}),
    };
    if (kind === "money") return <MoneyField key={key} {...props} value={values[key] ?? ""} onChange={(v) => setValue(key, v)} />;
    const common = { ...props, value: values[key] ?? "", onChange: set(key) };
    if (kind === "area") return <TextareaField key={key} {...common} maxLength={max} rows={3} className="sm:col-span-2 lg:col-span-3" />;
    return kind === "text"
      ? <TextField key={key} {...common} maxLength={max} autoComplete="off" />
      : <TextField key={key} {...common} type="number" inputMode="decimal" min={0} max={kind === "pct" ? 100 : undefined} step="any" />;
  };

  const copyLast = () =>
    startCopy(async () => {
      const r = await latestOrderAction(type, name);
      if (!r) return setCopyNote({ tone: "info", text: c.copyLastNone });
      setValues((v) => ({ ...v, ...r.values }));
      // The copied contact replaces the form's: keep its customer, or none (like the app's copy).
      setCustomer(r.values.customer_id ? { id: r.values.customer_id, name: r.values.ten_khach_hang ?? "" } : null);
      setCopyNote({ tone: "success", text: format(c.copyLastDone, { id: r.id }) });
    });

  const pick = (h: CustomerHit) => {
    setCustomer({ id: h.id, name: h.name });
    setValues((v) => ({
      ...v,
      ten_khach_hang: h.name,
      sdt_khach_hang: h.phone ?? "",
      dia_chi_khach_hang: h.address ?? "",
    }));
  };

  const submitLabel = mode === "edit" ? c.submitEdit : isQuote ? c.submitQuote : c.submit;
  const withWorkshop = mode === "create" && !isQuote && type === "bang_keo_in";

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="type" value={type} />
      {isQuote && <input type="hidden" name="is_quote" value="1" />}
      {orderId && <input type="hidden" name="id" value={orderId} />}
      {frozen && <input type="hidden" name="frozen" value="1" />}
      {frozen && <InlineStatus tone="info">{c.frozenNote}</InlineStatus>}
      {/* xl: who / what on the left, price and cost on the right. Totals + save stay in the bottom bar. */}
      <div className={`grid grid-cols-1 gap-4 xl:items-start [&>*]:min-w-0 ${frozen ? "" : "xl:grid-cols-2"}`}>
       <div className="flex flex-col gap-4">
        <Card title={c.secFormBasic}>
          <div className="flex flex-col gap-2 sm:col-span-2">
            <TextField
              name="ten_hang" label={f.ten_hang} value={name} onChange={set("ten_hang")} required maxLength={255}
              autoComplete="off" list={listId} error={errorOf("ten_hang")}
            />
            <datalist id={listId}>{names.map((n) => <option key={n} value={n} />)}</datalist>
            {!frozen && (
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" onClick={copyLast} disabled={copying || !name.trim()} className={buttonClass("secondary", "sm")} title={c.copyLastHint}>
                  {c.copyLast}
                </button>
                {copyNote && <span role="status" className={`text-xs ${copyNote.tone === "success" ? "text-pt-green-ink" : "text-pt-muted"}`}>{copyNote.text}</span>}
              </div>
            )}
          </div>
          <TextField
            name="ngay_du_kien" label={f.ngay_du_kien} type="date" value={values.ngay_du_kien ?? ""} onChange={set("ngay_du_kien")}
            required error={errorOf("ngay_du_kien")}
          />
          <CustomerPicker
            value={customer}
            onPick={pick}
            onCreate={setCustomer}
            onUnlink={() => setCustomer(null)}
            contact={{ name: values.ten_khach_hang ?? "", phone: values.sdt_khach_hang ?? "", address: values.dia_chi_khach_hang ?? "" }}
          />
          {field(["ten_khach_hang", "text", 255])}
          <TextField
            name="sdt_khach_hang" label={f.sdt_khach_hang} type="tel" inputMode="tel" maxLength={30} autoComplete="off"
            value={values.sdt_khach_hang ?? ""} onChange={set("sdt_khach_hang")} error={errorOf("sdt_khach_hang")}
          />
          <TextField
            name="dia_chi_khach_hang" label={f.dia_chi_khach_hang} maxLength={500} autoComplete="off"
            value={values.dia_chi_khach_hang ?? ""} onChange={set("dia_chi_khach_hang")} error={errorOf("dia_chi_khach_hang")}
          />
          {!frozen && BASIC_FIELDS[type].map(field)}
          {!frozen && type === "bang_keo_in" && (
            <div className="flex flex-col gap-1 sm:col-span-2 lg:col-span-3">
              <input type="hidden" name="loai_truc" value={axis ? "moi" : "cu"} />
              <label className="inline-flex min-h-11 cursor-pointer items-center gap-3 self-start text-sm font-medium text-pt-text">
                <input
                  type="checkbox" role="switch" checked={axis} className="peer sr-only"
                  onChange={(e) => setValue("loai_truc", e.target.checked ? "moi" : "cu")}
                />
                <span
                  aria-hidden
                  className="relative h-6 w-11 shrink-0 rounded-full bg-pt-line-strong transition-colors after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-transform peer-checked:bg-vt-blue peer-checked:after:translate-x-5 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-vt-blue"
                />
                {c.axisSwitch}
              </label>
              <p className="text-xs text-pt-muted">{c.axisSwitchHint}</p>
            </div>
          )}
        </Card>

        {!frozen && axis && <Card title={c.secFormNewAxis}>{visibleFields(AXIS_FIELDS, money).map(field)}</Card>}

        {withWorkshop && (
          <Card title={c.secFormWorkshop}>
            <SelectField
              name="workshop_user_id" label={f.workshop_user_id} value={values.workshop_user_id ?? ""} onChange={set("workshop_user_id")}
              placeholder={c.assigneeNone} options={workshopUsers.map((u) => ({ value: u.id, label: u.name }))}
            />
            <TextareaField
              name="production_note" label={f.production_note} value={values.production_note ?? ""} onChange={set("production_note")}
              maxLength={2000} rows={3} className="sm:col-span-2"
            />
          </Card>
        )}
       </div>

        {!frozen && (
          <Card title={c.secFormPrice}>
            {priceGroups(visibleFields(PRICE_FIELDS[type], money)).map(([group, fields]) => (
              <Fragment key={group}>
                <p className="col-span-full border-t border-pt-line pt-4 text-xs font-semibold uppercase tracking-wide text-pt-muted first:border-t-0 first:pt-0">
                  {c.priceGroup[group]}
                </p>
                {fields.map(field)}
              </Fragment>
            ))}
          </Card>
        )}
      </div>

      <div className="sticky bottom-0 z-20 -mx-4 flex flex-col gap-2 border-t border-pt-line bg-pt-surface px-4 py-3 shadow-[0_-6px_16px_-10px_rgb(22_23_58/0.25)] sm:-mx-6 sm:px-6">
        <ActionStatus state={state} />
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
          {!frozen && <OrderTotals totals={totals} money={money} />}
          <button type="submit" disabled={pending} className={buttonClass("primary", "md", "ml-auto w-full sm:w-auto sm:min-w-44")}>
            {pending ? c.saving : submitLabel}
          </button>
        </div>
      </div>
    </form>
  );
}
