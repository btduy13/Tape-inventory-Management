"use client";
// Web order form for printed tape, same fields and wording as the desktop form (bki-*).
// Inputs are controlled so a failed save keeps what was typed (React resets uncontrolled
// fields after a form action). The server action validates with zod; SQL recomputes money.
import { useActionState, useMemo, useState } from "react";
import { TextField, TextareaField, SelectField } from "@/features/portal-ui/components/Field";
import { ActionStatus } from "@/features/portal-ui/components/States";
import { buttonClass, surfaceClass } from "@/features/portal-ui/components/styles";
import { fieldLabel as f, ordersCopy as c, type FieldKey } from "../lib/copy";
import { formTotals } from "../lib/form-totals";
import { createOrderAction, type OrderActionState } from "../server/actions";
import type { WorkshopUser } from "../server/queries";
import { OrderTotals } from "./OrderTotals";

const IDLE: OrderActionState = { status: "idle" };
const REQUIRED = new Set<FieldKey>(["ten_hang", "ten_khach_hang", "ngay_du_kien", "so_luong", "don_gia_ban", "quy_cach_m", "cuon_cay"]);

type Props = { defaultDue: string; minDue: string; workshopUsers: WorkshopUser[] };

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className={`${surfaceClass} min-w-0 p-4 sm:p-5`}>
      <legend className="float-left mb-4 w-full text-base font-semibold text-pt-text">{title}</legend>
      <div className="clear-both grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
    </fieldset>
  );
}

export function OrderForm({ defaultDue, minDue, workshopUsers }: Props) {
  const [state, action, pending] = useActionState(createOrderAction, IDLE);
  const [values, setValues] = useState<Record<string, string>>({ ngay_du_kien: defaultDue, loai_truc: "cu", vat_percent: "" });
  const totals = useMemo(() => formTotals(values), [values]);
  const axis = values.loai_truc === "moi";
  const bad = new Set(state.status === "error" ? state.fields ?? [] : []);

  const set = (name: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setValues((v) => ({ ...v, [name]: e.target.value }));
  const common = (name: FieldKey) => ({
    name, label: f[name], value: values[name] ?? "", onChange: set(name),
    required: REQUIRED.has(name) || (axis && ["ten_truc", "truc_so_luong", "truc_gia_goc", "truc_gia_ban"].includes(name)),
    error: bad.has(name) ? c.errorValidation : null,
  });
  const text = (name: FieldKey, max: number, extra: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <TextField {...common(name)} maxLength={max} autoComplete="off" {...extra} />
  );
  const num = (name: FieldKey, max?: number) => (
    <TextField {...common(name)} type="number" inputMode="decimal" min={0} max={max} step="any" />
  );

  return (
    <form action={action} className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
      <div className="flex min-w-0 flex-col gap-4">
        <Group title={c.secFormCustomer}>
          {text("ten_hang", 255)}
          <TextField {...common("ngay_du_kien")} type="date" min={minDue} />
          {text("ten_khach_hang", 255)}
          {text("sdt_khach_hang", 30, { type: "tel", inputMode: "tel" })}
          <TextField {...common("dia_chi_khach_hang")} maxLength={500} autoComplete="off" className="sm:col-span-2" />
        </Group>

        <Group title={c.secFormSpec}>
          {num("quy_cach_mm")}
          {num("quy_cach_m")}
          {num("quy_cach_mic")}
          {num("cuon_cay")}
          {num("so_luong")}
          {text("mau_keo", 100)}
          {text("mau_sac", 100)}
        </Group>

        <Group title={c.secFormCost}>
          {num("don_gia_von")}
          {num("phi_sl")}
          {num("phi_keo")}
          {num("phi_mau")}
          {num("phi_size")}
          {num("phi_cat")}
        </Group>

        <Group title={c.secFormSale}>
          {num("don_gia_ban")}
          {num("vat_percent", 100)}
          {num("tien_coc")}
        </Group>

        <Group title={c.secFormCtv}>
          {text("ctv", 255)}
          {num("hoa_hong", 100)}
          {num("tien_ship")}
          {text("loi_giay", 255)}
          {text("thung_bao", 255)}
        </Group>

        <Group title={c.secFormAxis}>
          <SelectField
            name="loai_truc" label={f.loai_truc} value={values.loai_truc} onChange={set("loai_truc")}
            options={[{ value: "cu", label: c.axisOld }, { value: "moi", label: c.axisNew }]}
          />
          {axis && (
            <>
              {text("ten_truc", 255)}
              {num("truc_chu_vi")}
              {num("truc_so_luong")}
              {num("truc_gia_goc")}
              {num("truc_gia_ban")}
              {num("truc_vat_percent", 100)}
              {text("truc_ctv", 255)}
              {num("truc_hoa_hong", 100)}
            </>
          )}
        </Group>

        <Group title={c.secFormWorkshop}>
          <SelectField
            name="workshop_user_id" label={f.workshop_user_id} value={values.workshop_user_id ?? ""} onChange={set("workshop_user_id")}
            placeholder={c.assigneeNone} options={workshopUsers.map((u) => ({ value: u.id, label: u.name }))}
          />
          <TextareaField
            name="production_note" label={f.production_note} value={values.production_note ?? ""} onChange={set("production_note")}
            maxLength={2000} rows={3} className="sm:col-span-2"
          />
        </Group>
      </div>

      <div className="flex flex-col gap-3 lg:sticky lg:top-4">
        <OrderTotals totals={totals} axis={axis} />
        <ActionStatus state={state} />
        <button type="submit" disabled={pending} className={buttonClass("primary", "md", "w-full")}>
          {pending ? c.saving : c.submit}
        </button>
      </div>
    </form>
  );
}
