"use client";
// Create (no customer: opens the new one on save) or edit one customer. Controlled inputs so a
// failed save keeps what was typed (React resets uncontrolled fields after a form action).
import { useActionState, useState } from "react";
import { TextField, TextareaField } from "@/features/portal-ui/components/Field";
import { ActionStatus } from "@/features/portal-ui/components/States";
import { buttonClass } from "@/features/portal-ui/components/styles";
import { customersCopy as c } from "../lib/copy";
import type { Customer } from "../lib/types";
import { saveCustomerAction, type CustomerActionState } from "../server/actions";

const IDLE: CustomerActionState = { status: "idle" };
const FIELDS = ["name", "phone", "address", "company", "note"] as const;

export function CustomerForm({ customer }: { customer?: Customer }) {
  const [state, action, pending] = useActionState(saveCustomerAction, IDLE);
  const [v, setV] = useState<Record<(typeof FIELDS)[number], string>>(
    () => Object.fromEntries(FIELDS.map((k) => [k, customer?.[k] ?? ""])) as Record<(typeof FIELDS)[number], string>,
  );
  const field = (name: (typeof FIELDS)[number]) => ({
    name, label: c[name], value: v[name], onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setV((s) => ({ ...s, [name]: e.target.value })),
  });

  return (
    <form action={action} className="flex flex-col gap-4">
      {customer && <input type="hidden" name="id" value={customer.id} />}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TextField {...field("name")} required maxLength={255} autoComplete="off" />
        <TextField {...field("phone")} type="tel" inputMode="tel" maxLength={30} autoComplete="off" />
        <TextField {...field("company")} maxLength={255} autoComplete="off" />
        <TextField {...field("address")} maxLength={500} autoComplete="off" />
        <TextareaField {...field("note")} maxLength={2000} className="sm:col-span-2" />
      </div>
      <ActionStatus state={state} />
      <div>
        <button type="submit" disabled={pending} className={buttonClass("primary")}>
          {pending ? c.saving : customer ? c.save : c.create}
        </button>
      </div>
    </form>
  );
}
