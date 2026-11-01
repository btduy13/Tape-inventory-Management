"use client";
// Quote request form shown next to the designer on /thiet-ke.
// The page passes `getDesign` from features/designer (see lib/design-contract.ts).
import { useCallback, useRef, type FormEvent } from "react";
import type { TurnstileInstance } from "@marsidev/react-turnstile";
import { getDictionary } from "@/i18n";
import type { GetLeadDesign } from "../lib/design-contract";
import { FormField } from "./FormField";
import { LeadSuccess } from "./LeadSuccess";
import { TurnstileWidget } from "./TurnstileWidget";
import { useLeadSubmit } from "./useLeadSubmit";

export type LeadFormProps = {
  getDesign: GetLeadDesign;
  turnstileSiteKey: string;
  /** CSP nonce (from the `x-nonce` request header) for the Turnstile script. */
  nonce?: string;
  /** Hide the title + intro when the surrounding layout already shows them (designer step 4). */
  hideHeading?: boolean;
};

export function LeadForm({ getDesign, turnstileSiteKey, nonce, hideHeading = false }: LeadFormProps) {
  const t = getDictionary().leadIntake;
  const captcha = useRef<TurnstileInstance | undefined>(undefined);
  const resetCaptcha = useCallback(() => captcha.current?.reset(), []);
  const { values, errors, state, setField, setToken, submit, reset } = useLeadSubmit(getDesign, resetCaptcha);

  if (state.kind === "success") return <LeadSuccess code={state.code} onNew={reset} />;

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void submit();
  };
  const busy = state.kind === "submitting";

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4" aria-busy={busy}>
      {hideHeading ? (
        <h3 className="sr-only">{t.formTitle}</h3>
      ) : (
        <div>
          <h2 className="text-xl font-bold text-slate-900">{t.formTitle}</h2>
          <p className="text-sm text-slate-600">{t.intro}</p>
        </div>
      )}
      <FormField id="name" label={t.name} required autoComplete="name" maxLength={120}
        placeholder={t.placeholderName} value={values.name} error={errors.name}
        onChange={(v) => setField("name", v)} />
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField id="phone" label={t.phone} required type="tel" inputMode="tel" autoComplete="tel"
          maxLength={20} placeholder={t.placeholderPhone} value={values.phone} error={errors.phone}
          onChange={(v) => setField("phone", v)} />
        <FormField id="email" label={t.email} type="email" inputMode="email" autoComplete="email"
          maxLength={254} placeholder={t.placeholderEmail} hint={t.emailHint} value={values.email}
          error={errors.email} onChange={(v) => setField("email", v)} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField id="company" label={t.company} autoComplete="organization" maxLength={200}
          placeholder={t.placeholderCompany} value={values.company} error={errors.company}
          onChange={(v) => setField("company", v)} />
        <FormField id="quantity" label={t.quantity} required inputMode="numeric" maxLength={12}
          value={values.quantity} error={errors.quantity} onChange={(v) => setField("quantity", v)} />
      </div>
      <FormField id="note" label={t.note} multiline maxLength={2000} placeholder={t.placeholderNote}
        value={values.note} error={errors.note} onChange={(v) => setField("note", v)} />

      {/* Honeypot: visually hidden, skipped by keyboard and screen readers. */}
      <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label htmlFor="website">{t.honeypot}</label>
        <input id="website" name="website" tabIndex={-1} autoComplete="off"
          value={values.website} onChange={(e) => setField("website", e.target.value)} />
      </div>

      <TurnstileWidget ref={captcha} siteKey={turnstileSiteKey} nonce={nonce} onToken={setToken} />

      {state.kind === "error" && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-800 ring-1 ring-red-200">{state.message}</p>
      )}
      <button
        type="submit"
        disabled={busy}
        className="inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-lg bg-slate-900 px-6 font-semibold text-white transition-colors duration-150 hover:bg-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none"
      >
        {busy && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent motion-reduce:animate-none" aria-hidden="true" />}
        {busy ? t.submitting : t.submit}
      </button>
    </form>
  );
}
