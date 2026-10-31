import { describe, expect, it } from "vitest";
import { parseCallbackParams, UPDATE_PASSWORD_PATH } from "./callback";
import { formToObject, loginSchema, updatePasswordSchema } from "./schemas";

const p = (q: string) => parseCallbackParams(new URLSearchParams(q));

describe("parseCallbackParams", () => {
  it("accepts a PKCE code with a safe next", () => {
    expect(p("code=abc123def&next=/portal/leads/1")).toEqual({ kind: "code", code: "abc123def", next: "/portal/leads/1" });
  });

  it("rejects open redirects in next", () => {
    expect(p("code=abc123def&next=//evil.com").next).toBe("/portal");
    expect(p("code=abc123def&next=https://evil.com").next).toBe("/portal");
    expect(p("code=abc123def&next=/%5C%5Cevil.com").next).toBe("/portal");
  });

  it("forces invite/recovery to the set-password page", () => {
    expect(p("token_hash=hash_123456&type=invite&next=/admin")).toEqual({
      kind: "otp", tokenHash: "hash_123456", type: "invite", next: UPDATE_PASSWORD_PATH,
    });
    expect(p("token_hash=hash_123456&type=recovery").next).toBe(UPDATE_PASSWORD_PATH);
  });

  it("rejects unknown types and malformed tokens", () => {
    expect(p("token_hash=hash_123456&type=admin").kind).toBe("invalid");
    expect(p("code=<script>").kind).toBe("invalid");
    expect(p("").kind).toBe("invalid");
  });
});

describe("auth schemas", () => {
  it("normalises email", () => {
    const r = loginSchema.parse({ email: "  A@B.VN ", password: "x" });
    expect(r.email).toBe("a@b.vn");
  });

  it("checks password length and confirmation", () => {
    expect(updatePasswordSchema.safeParse({ password: "short", confirm: "short" }).error?.issues[0]?.message).toBe("passwordTooShort");
    expect(updatePasswordSchema.safeParse({ password: "longenough1", confirm: "different1" }).error?.issues[0]?.message).toBe("passwordMismatch");
    expect(updatePasswordSchema.safeParse({ password: "longenough1", confirm: "longenough1" }).success).toBe(true);
  });

  it("formToObject keeps first string value only", () => {
    const f = new FormData();
    f.append("a", "1");
    f.append("a", "2");
    f.append("file", new Blob(["x"]));
    expect(formToObject(f)).toEqual({ a: "1" });
  });
});
