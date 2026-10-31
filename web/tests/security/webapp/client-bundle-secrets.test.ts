// Rule: built client assets (web/.next/static) contain no server secret values or names.
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { NEXT_DIR, serverSecretValues } from "../helpers/web";

function walk(dir: string, out: string[] = []): string[] {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

const NAMES = /SUPABASE_SERVICE_ROLE_KEY|TURNSTILE_SECRET_KEY|IP_HASH_SALT|RESEND_API_KEY|service_role/;

describe("client bundle contains no server secrets", () => {
  const dir = path.join(NEXT_DIR, "static");
  const files = fs.existsSync(dir) ? walk(dir).filter((f) => /\.(js|css|json|map|txt|html)$/.test(f)) : [];

  it("a production build exists", () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it("no secret values or server-only env names in .next/static", () => {
    const secrets = serverSecretValues();
    expect(secrets.length, "secrets loaded from .env.local").toBeGreaterThan(0);
    const hits: string[] = [];
    for (const f of files) {
      const text = fs.readFileSync(f, "utf8");
      for (const s of secrets) if (text.includes(s.value)) hits.push(`${path.relative(NEXT_DIR, f)}: value of ${s.name}`);
      const m = text.match(NAMES);
      if (m) hits.push(`${path.relative(NEXT_DIR, f)}: ${m[0]}`);
    }
    expect(hits).toEqual([]);
  });
});
