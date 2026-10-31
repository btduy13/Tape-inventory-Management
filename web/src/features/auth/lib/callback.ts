// Pure parsing of /auth/callback query params (PKCE `code` or email `token_hash` + `type`).
import { safeNextPath } from "@/lib/security/safe-redirect";
import { ROUTES } from "@/lib/routes";

export const UPDATE_PASSWORD_PATH = "/auth/update-password";
export const RESET_REQUEST_PATH = "/auth/reset";

const OTP_TYPES = ["invite", "recovery", "signup", "magiclink", "email", "email_change"] as const;
export type CallbackOtpType = (typeof OTP_TYPES)[number];

export type CallbackParams =
  | { kind: "code"; code: string; next: string }
  | { kind: "otp"; tokenHash: string; type: CallbackOtpType; next: string }
  | { kind: "invalid"; next: string };

const TOKEN_RE = /^[A-Za-z0-9_\-.]{6,512}$/;

/** Invite / recovery links must land on the set-password page regardless of `next`. */
function defaultNextFor(type: CallbackOtpType | null): string | null {
  return type === "invite" || type === "recovery" ? UPDATE_PASSWORD_PATH : null;
}

export function parseCallbackParams(params: URLSearchParams): CallbackParams {
  const rawType = params.get("type");
  const type = (OTP_TYPES as readonly string[]).includes(rawType ?? "")
    ? (rawType as CallbackOtpType)
    : null;
  const next = defaultNextFor(type) ?? safeNextPath(params.get("next"), ROUTES.portal);

  const code = params.get("code");
  if (code && TOKEN_RE.test(code)) return { kind: "code", code, next };

  const tokenHash = params.get("token_hash");
  if (tokenHash && type && TOKEN_RE.test(tokenHash)) {
    return { kind: "otp", tokenHash, type, next };
  }
  return { kind: "invalid", next };
}
