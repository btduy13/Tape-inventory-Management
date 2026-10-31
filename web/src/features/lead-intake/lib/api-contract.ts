// Wire contract of POST /api/leads (shared by the route handler and the client form).

/** Multipart field names. */
export const LEAD_FIELDS = {
  name: "name",
  phone: "phone",
  email: "email",
  company: "company",
  quantity: "quantity",
  note: "note",
  design: "design",
  logo: "logo",
  preview: "preview",
  turnstileToken: "turnstileToken",
  /** Honeypot: hidden from humans, bots fill it. */
  honeypot: "website",
} as const;

export type LeadFieldName = "name" | "phone" | "email" | "company" | "quantity" | "note";

export type LeadErrorCode =
  | "csrf"
  | "rate_limited"
  | "captcha"
  | "validation"
  | "design"
  | "file"
  | "too_large"
  | "server";

export type LeadSubmitResponse =
  | { ok: true; code: string }
  | { ok: false; error: LeadErrorCode; fields?: Partial<Record<LeadFieldName, string>> };

export const LEAD_ERROR_STATUS: Record<LeadErrorCode, number> = {
  csrf: 403,
  rate_limited: 429,
  captcha: 400,
  validation: 422,
  design: 422,
  file: 415,
  too_large: 413,
  server: 500,
};

/** Turnstile widget action (checked by the server). */
export const TURNSTILE_ACTION = "lead_submit";

/** Per-file cap (matches storage bucket file_size_limit). */
export const MAX_FILE_BYTES = 5 * 1024 * 1024;
/** Whole multipart body cap: logo + preview + fields. */
export const MAX_BODY_BYTES = 2 * MAX_FILE_BYTES + 256 * 1024;
/** Cap for the design JSON string. */
export const MAX_DESIGN_JSON_CHARS = 20_000;
