// Builds the multipart body for POST /api/leads (browser side).
import { LEAD_FIELDS, type LeadFieldName } from "./api-contract";
import type { LeadDesign } from "./design-contract";

export type LeadFormValues = Record<LeadFieldName, string> & { website: string };

export const EMPTY_LEAD_FORM: LeadFormValues = {
  name: "",
  phone: "",
  email: "",
  company: "",
  quantity: "",
  note: "",
  website: "",
};

export function buildLeadFormData(
  values: LeadFormValues,
  design: LeadDesign,
  turnstileToken: string,
): FormData {
  const fd = new FormData();
  fd.set(LEAD_FIELDS.name, values.name);
  fd.set(LEAD_FIELDS.phone, values.phone);
  fd.set(LEAD_FIELDS.email, values.email);
  fd.set(LEAD_FIELDS.company, values.company);
  fd.set(LEAD_FIELDS.quantity, values.quantity);
  fd.set(LEAD_FIELDS.note, values.note);
  fd.set(LEAD_FIELDS.honeypot, values.website);
  fd.set(LEAD_FIELDS.turnstileToken, turnstileToken);
  // logo.path is server-owned; never send a client value.
  const designJson = {
    ...design.designJson,
    logo: design.designJson.logo ? { ...design.designJson.logo, path: null } : null,
  };
  fd.set(LEAD_FIELDS.design, JSON.stringify(designJson));
  if (design.logoFile) fd.set(LEAD_FIELDS.logo, design.logoFile, design.logoFile.name);
  if (design.previewPng) fd.set(LEAD_FIELDS.preview, design.previewPng, "preview.png");
  return fd;
}
