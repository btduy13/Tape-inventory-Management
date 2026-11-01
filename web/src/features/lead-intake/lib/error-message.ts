// Maps API error codes to Vietnamese messages for the form banner.
import { getDictionary } from "@/i18n";
import type { LeadErrorCode } from "./api-contract";

export function leadErrorMessage(code: LeadErrorCode | "network"): string {
  const d = getDictionary();
  const e = d.leadIntake.errors;
  switch (code) {
    case "csrf":
      return e.csrf;
    case "rate_limited":
      return d.common.errorRateLimited;
    case "captcha":
      return e.captcha;
    case "validation":
      return d.common.errorValidation;
    case "design":
      return e.design;
    case "tape_size":
      return d.tapeSpec.sizeRejected;
    case "file":
      return e.file;
    case "too_large":
      return e.tooLarge;
    case "network":
      return e.network;
    default:
      return d.common.errorGeneric;
  }
}

const CODES: readonly string[] = [
  "csrf", "rate_limited", "captcha", "validation", "design", "tape_size", "file", "too_large", "server",
];

export function isLeadErrorCode(v: unknown): v is LeadErrorCode {
  return typeof v === "string" && CODES.includes(v);
}
