// Turns the multipart body into validated, typed parts (no I/O besides reading blobs).
import "server-only";
import { LEAD_FIELDS, type LeadErrorCode, type LeadSubmitResponse } from "../lib/api-contract";
import { fieldErrors, leadFieldsSchema, type LeadFields } from "../lib/lead-schema";
import { parseDesignJson, type ValidDesign } from "../lib/design-schema";
import { validateUpload, type ValidUpload } from "../lib/upload-validation";

export type ParsedSubmission = {
  fields: LeadFields;
  design: ValidDesign;
  logo: ValidUpload | null;
  preview: ValidUpload | null;
};

export type ParseResult =
  | { ok: true; value: ParsedSubmission }
  | { ok: false; response: Extract<LeadSubmitResponse, { ok: false }> };

const fail = (error: LeadErrorCode, fields?: Record<string, string>): ParseResult => ({
  ok: false,
  response: fields ? { ok: false, error, fields } : { ok: false, error },
});

export async function parseSubmission(form: FormData): Promise<ParseResult> {
  const text = (name: string) => {
    const v = form.get(name);
    return typeof v === "string" ? v : "";
  };

  const fields = leadFieldsSchema.safeParse({
    name: text(LEAD_FIELDS.name),
    phone: text(LEAD_FIELDS.phone),
    email: text(LEAD_FIELDS.email),
    company: text(LEAD_FIELDS.company),
    quantity: text(LEAD_FIELDS.quantity),
    note: text(LEAD_FIELDS.note),
  });
  if (!fields.success) return fail("validation", fieldErrors(fields.error));

  const design = parseDesignJson(form.get(LEAD_FIELDS.design));
  if (!design) return fail("design");

  const logo = await validateUpload(form.get(LEAD_FIELDS.logo), "logo");
  if (!logo.ok) return fail(logo.error);
  const preview = await validateUpload(form.get(LEAD_FIELDS.preview), "preview");
  if (!preview.ok) return fail(preview.error);

  return {
    ok: true,
    value: { fields: fields.data, design, logo: logo.file, preview: preview.file },
  };
}
