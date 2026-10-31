// Static guard: server secrets must never reach the client bundle.
// Fails if a file touches the service role key / admin client / server env without
// importing "server-only", if a Client Component imports them, or if a secret is
// given a NEXT_PUBLIC_ name (Next.js inlines those into browser JS).
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

// vitest runs from web/ (jsdom environment: import.meta.url is not a file: URL).
const SRC = join(process.cwd(), "src");
const ENV_EXAMPLE = join(SRC, "..", ".env.example");

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return walk(p);
    return /\.(ts|tsx)$/.test(name) && !/\.test\.tsx?$/.test(name) ? [p] : [];
  });
}

const files = walk(SRC).map((p) => ({ path: relative(SRC, p).replace(/\\/g, "/"), text: readFileSync(p, "utf8") }));
const SECRET_USE = /SUPABASE_SERVICE_ROLE_KEY|RESEND_API_KEY|TURNSTILE_SECRET_KEY|IP_HASH_SALT/;
const SERVER_ONLY_IMPORT = /^import\s+["']server-only["'];?/m;
const SERVER_MODULES = /from\s+["']@\/lib\/(supabase\/admin|env\.server)["']/;

describe("secret exposure", () => {
  it("scans the real source tree", () => {
    expect(files.some((f) => f.path === "lib/supabase/admin.ts")).toBe(true);
  });

  it("files using server secrets import 'server-only'", () => {
    const offenders = files
      .filter((f) => SECRET_USE.test(f.text) && !SERVER_ONLY_IMPORT.test(f.text))
      .map((f) => f.path);
    expect(offenders).toEqual([]);
  });

  it("client components never import the admin client or server env", () => {
    const offenders = files
      .filter((f) => /^["']use client["']/m.test(f.text) && SERVER_MODULES.test(f.text))
      .map((f) => f.path);
    expect(offenders).toEqual([]);
  });

  it("no secret is exposed through a NEXT_PUBLIC_ variable", () => {
    const names = [...files.map((f) => f.text), readFileSync(ENV_EXAMPLE, "utf8")]
      .join("\n")
      .match(/NEXT_PUBLIC_[A-Z0-9_]+/g) ?? [];
    const bad = [...new Set(names)].filter((n) => /SERVICE|SECRET|PRIVATE|RESEND|SALT|PASSWORD/.test(n));
    expect(bad).toEqual([]);
  });
});
