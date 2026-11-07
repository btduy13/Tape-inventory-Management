"use client";
// Web order form for the 4 order types, same fields and wording as the desktop forms (bki-*, bk-*,
// ti-*; Thank you: name, size, colour). Create (order or quote) and edit. Inputs are controlled so
// a failed save keeps what was typed (React resets uncontrolled fields after a form action). The
// server action validates with zod; SQL recomputes every amount.
import { useActionState, useEffect, useId, useMemo, useState, useTransition } from "react";
import { format } from "@/i18n";
import { TextField, TextareaField, SelectField } from "@/features/portal-ui/components/Field";
import { ActionStatus, InlineStatus } from "@/features/portal-ui/components/States";
import { buttonClass, surfaceClass } from "@/features/portal-ui/components/styles";
import type { WorkshopUser } from "@/features/workshop/server/queries";
import { fieldLabel as f, ordersCopy as c, type FieldKey } from "../lib/copy";
import { orderTotals } from "../lib/form-totals";
import type { CustomerHit, OrderType } from "../lib/types";
import {
  createOrderAction, latestOrderAction, suggestNamesAction, updateOrderAction, type OrderActionState,
} from "../server/actions";
import { CustomerPicker, type PickedCustomer } from "./CustomerPicker";
import { OrderTotals } from "./OrderTotals";

const IDLE: OrderActionState = { status: "idle" };

type Kind = "text" | "num" | "pct";
type Spec = readonly [FieldKey, Kind, number?];
type Group = { title: string; fields: readonly Spec[] };

const ctvShort: Group = { title: c.secFormCtvShort, fields: [["ctv", "text", 255], ["hoa_hong", "pct"], ["tien_ship", "num"]] };
const plainPrice: Group = { title: c.secFormPrice, fields: [["don_gia_goc", "num"], ["don_gia_ban", "num"], ["vat_percent", "pct"]] };

/** Field groups after "Đơn và khách hàng", per type (the printed-tape axis / workshop groups are added below). */
const GROUPS: Readonly<Record<OrderType, readonly Group[]>> = {
  bang_keo_in: [
    { title: c.secFormSpec, fields: [["quy_cach_mm", "num"], ["quy_cach_m", "num"], ["quy_cach_mic", "num"], ["cuon_cay", "num"], ["so_luong", "num"], ["mau_keo", "text", 100], ["mau_sac", "text", 100]] },
    { title: c.secFormCost, fields: [["don_gia_von", "num"], ["phi_sl", "num"], ["phi_keo", "num"], ["phi_mau", "num"], ["phi_size", "num"], ["phi_cat", "num"]] },
    { title: c.secFormSale, fields: [["don_gia_ban", "num"], ["vat_percent", "pct"], ["tien_coc", "num"]] },
    { title: c.secFormCtv, fields: [["ctv", "text", 255], ["hoa_hong", "pct"], ["tien_ship", "num"], ["loi_giay", "text", 255], ["thung_bao", "text", 255]] },
  ],
  bang_keo: [{ title: c.secFormSpec, fields: [["quy_cach", "text", 255], ["so_luong", "num"], ["mau_sac", "text", 100]] }, plainPrice, ctvShort],
  truc_in: [{ title: c.secFormSpec, fields: [["quy_cach", "text", 255], ["so_luong", "num"], ["mau_sac", "text", 100], ["mau_keo", "text", 100]] }, plainPrice, ctvShort],
  thank_you: [
    { title: c.secFormSpec, fields: [["kich_thuoc", "text", 255], ["mau_sac", "text", 100], ["so_luong", "num"]] },
    { title: c.secFormSale, fields: [["don_gia_von", "num"], ["don_gia_ban", "num"], ["vat_percent", "pct"], ["tien_coc", "num"]] },
    ctvShort,
  ],
};

const AXIS_FIELDS: readonly Spec[] = [
  ["ten_truc", "text", 255], ["truc_chu_vi", "num"], ["truc_so_luong", "num"], ["truc_gia_goc", "num"], ["truc_gia_ban", "num"],
  ["truc_vat_percent", "pct"], ["truc_ctv", "text", 255], ["truc_hoa_hong", "pct"],
];
const AXIS_REQUIRED = new Set<FieldKey>(["ten_truc", "truc_so_luong", "truc_gia_goc", "truc_gia_ban"]);

function requiredFor(type: OrderType): Set<FieldKey> {
  const base: FieldKey[] = ["ten_hang", "ten_khach_hang", "ngay_du_kien", "so_luong", "don_gia_ban"];
  if (type === "bang_keo_in") base.push("quy_cach_m", "cuon_cay");
  if (type === "bang_keo" || type === "truc_in") base.push("don_gia_goc");
  return new Set(base);
}

type Props = {
  type: OrderType;
  mode: "create" | "edit";
  isQuote?: boolean;
  orderId?: string;
  /** Multi-size quote order: only name, customer and due date can change (money frozen). */
  frozen?: boolean;
  initial: Record<string, string>;
  initialCustomer: PickedCustomer | null;
  minDue?: string;
  workshopUsers: WorkshopUser[];
};

function Fieldset({ title, children, wide = false }: { title: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <fieldset className={`${surfaceClass} min-w-0 p-4 sm:p-5`}>
      <legend className="float-left mb-4 w-full text-base font-semibold text-pt-text">{title}</legend>
      <div className={`clear-both grid grid-cols-1 gap-4 sm:grid-cols-2 ${wide ? "" : "lg:grid-cols-3"}`}>{children}</div>
    </fieldset>
  );
}

export function OrderForm({ type, mode, isQuote = false, orderId, frozen = false, initial, initialCustomer, minDue, workshopUsers }: Props) {
  const [state, action, pending] = useActionState(mode === "edit" ? updateOrderAction : createOrderAction, IDLE);
  const [values, setValues] = useState<Record<string, string>>(initial);
  const [customer, setCustomer] = useState<PickedCustomer | null>(initialCustomer);
  const [names, setNames] = useState<string[]>([]);
  const [copyNote, setCopyNote] = useState<{ tone: "success" | "info"; text: string } | null>(null);
  const [copying, startCopy] = useTransition();
  const listId = useId();
  const totals = useMemo(() => orderTotals(type, values), [type, values]);
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

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setValues((v) => ({ ...v, [key]: e.target.value }));
  const field = ([key, kind, max]: Spec) => {
    const props = {
      name: key, label: f[key], value: values[key] ?? "", onChange: set(key),
      required: required.has(key) || (axis && AXIS_REQUIRED.has(key)),
      error: bad.has(key) ? c.errorValidation : null,
    };
    return kind === "text"
      ? <TextField key={key} {...props} maxLength={max} autoComplete="off" />
      : <TextField key={key} {...props} type="number" inputMode="decimal" min={0} max={kind === "pct" ? 100 : undefined} step="any" />;
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
      sdt_khach_hang: h.phone ?? v.sdt_khach_hang ?? "",
      dia_chi_khach_hang: h.address ?? v.dia_chi_khach_hang ?? "",
    }));
  };

  const submitLabel = mode === "edit" ? c.submitEdit : isQuote ? c.submitQuote : c.submit;
  const withWorkshop = mode === "create" && !isQuote && type === "bang_keo_in";

  return (
    <form action={action} className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
      <input type="hidden" name="type" value={type} />
      {isQuote && <input type="hidden" name="is_quote" value="1" />}
      {orderId && <input type="hidden" name="id" value={orderId} />}
      {frozen && <input type="hidden" name="frozen" value="1" />}
      <div className="flex min-w-0 flex-col gap-4">
        {frozen && <InlineStatus tone="info">{c.frozenNote}</InlineStatus>}
        <Fieldset title={c.secFormCustomer}>
          <CustomerPicker
            value={customer}
            onPick={pick}
            onUnlink={() => setCustomer(null)}
            contact={{ name: values.ten_khach_hang ?? "", phone: values.sdt_khach_hang ?? "", address: values.dia_chi_khach_hang ?? "" }}
          />
          <div className="flex flex-col gap-2 sm:col-span-2">
            <TextField
              name="ten_hang" label={f.ten_hang} value={name} onChange={set("ten_hang")} required maxLength={255}
              autoComplete="off" list={listId} error={bad.has("ten_hang") ? c.errorValidation : null}
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
            name="ngay_du_kien" label={f.ngay_du_kien} type="date" min={minDue} value={values.ngay_du_kien ?? ""} onChange={set("ngay_du_kien")}
            required error={bad.has("ngay_du_kien") ? c.errorValidation : null}
          />
          {field(["ten_khach_hang", "text", 255])}
          <TextField
            name="sdt_khach_hang" label={f.sdt_khach_hang} type="tel" inputMode="tel" maxLength={30} autoComplete="off"
            value={values.sdt_khach_hang ?? ""} onChange={set("sdt_khach_hang")} error={bad.has("sdt_khach_hang") ? c.errorValidation : null}
          />
          <TextField
            name="dia_chi_khach_hang" label={f.dia_chi_khach_hang} maxLength={500} autoComplete="off" className="sm:col-span-2"
            value={values.dia_chi_khach_hang ?? ""} onChange={set("dia_chi_khach_hang")} error={bad.has("dia_chi_khach_hang") ? c.errorValidation : null}
          />
        </Fieldset>

        {!frozen && GROUPS[type].map((g) => <Fieldset key={g.title} title={g.title}>{g.fields.map(field)}</Fieldset>)}

        {!frozen && type === "bang_keo_in" && (
          <Fieldset title={c.secFormAxis}>
            <SelectField
              name="loai_truc" label={f.loai_truc} value={values.loai_truc ?? "cu"} onChange={set("loai_truc")}
              options={[{ value: "cu", label: c.axisOld }, { value: "moi", label: c.axisNew }]}
            />
            {axis && AXIS_FIELDS.map(field)}
          </Fieldset>
        )}

        {!frozen && type === "thank_you" && (
          <Fieldset title={c.secFormNote} wide>
            <TextareaField
              name="ghi_chu" label={f.ghi_chu} value={values.ghi_chu ?? ""} onChange={set("ghi_chu")} maxLength={2000} rows={3} className="sm:col-span-2"
            />
          </Fieldset>
        )}

        {withWorkshop && (
          <Fieldset title={c.secFormWorkshop}>
            <SelectField
              name="workshop_user_id" label={f.workshop_user_id} value={values.workshop_user_id ?? ""} onChange={set("workshop_user_id")}
              placeholder={c.assigneeNone} options={workshopUsers.map((u) => ({ value: u.id, label: u.name }))}
            />
            <TextareaField
              name="production_note" label={f.production_note} value={values.production_note ?? ""} onChange={set("production_note")}
              maxLength={2000} rows={3} className="sm:col-span-2"
            />
          </Fieldset>
        )}
      </div>

      <div className="flex flex-col gap-3 lg:sticky lg:top-4">
        {!frozen && <OrderTotals totals={totals} />}
        <ActionStatus state={state} />
        <button type="submit" disabled={pending} className={buttonClass("primary", "md", "w-full")}>
          {pending ? c.saving : submitLabel}
        </button>
      </div>
    </form>
  );
}
