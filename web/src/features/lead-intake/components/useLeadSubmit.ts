"use client";
// Form state + submit flow for the quote request (client side validation is UX only).
import { useCallback, useState } from "react";
import { getDictionary } from "@/i18n";
import type { LeadFieldName } from "../lib/api-contract";
import { buildLeadFormData, EMPTY_LEAD_FORM, type LeadFormValues } from "../lib/build-form-data";
import type { GetLeadDesign } from "../lib/design-contract";
import { leadErrorMessage } from "../lib/error-message";
import { fieldErrors, leadFieldsSchema } from "../lib/lead-schema";
import { submitLead } from "../lib/submit-lead";

export type SubmitState =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "success"; code: string }
  | { kind: "error"; message: string };

export function useLeadSubmit(getDesign: GetLeadDesign, onDone?: () => void) {
  const t = getDictionary().leadIntake;
  const [values, setValues] = useState<LeadFormValues>(EMPTY_LEAD_FORM);
  const [errors, setErrors] = useState<Partial<Record<LeadFieldName, string>>>({});
  const [token, setToken] = useState<string | null>(null);
  const [state, setState] = useState<SubmitState>({ kind: "idle" });

  const setField = useCallback((name: keyof LeadFormValues, value: string) => {
    setValues((v) => ({ ...v, [name]: value }));
    setErrors((e) => (name in e ? { ...e, [name]: undefined } : e));
  }, []);

  const submit = useCallback(async () => {
    const check = leadFieldsSchema.safeParse(values);
    if (!check.success) {
      setErrors(fieldErrors(check.error));
      return;
    }
    if (!token) {
      setState({ kind: "error", message: t.captchaRequired });
      return;
    }
    setState({ kind: "submitting" });
    const design = await getDesign().catch(() => null);
    if (!design) {
      setState({ kind: "error", message: t.designRequired });
      return;
    }
    if (design.invalidMessage) {
      setState({ kind: "error", message: design.invalidMessage });
      return;
    }
    const res = await submitLead(buildLeadFormData(values, design, token));
    setToken(null); // Turnstile tokens are single use.
    onDone?.();
    if (res.ok) {
      setState({ kind: "success", code: res.code });
      setValues(EMPTY_LEAD_FORM);
      return;
    }
    if ("fields" in res && res.fields) setErrors(res.fields);
    setState({ kind: "error", message: leadErrorMessage(res.error) });
  }, [values, token, getDesign, onDone, t]);

  const reset = useCallback(() => setState({ kind: "idle" }), []);

  return { values, errors, state, setField, setToken, submit, reset };
}
