// Rule: error responses (404, 500, bad action payloads, malformed API bodies) carry no stack
// traces, file paths or environment values.
import { describe, expect, it } from "vitest";
import { WEB_ORIGIN, serverSecretValues, webFetch } from "../helpers/web";

const LEAKS = [
  /\bat [\w.<>$]+ \((?:file:|[A-Za-z]:\\|\/)[^)]*:\d+:\d+\)/,
  /node_modules[\\/]/,
  /webpack-internal:/,
  /[A-Za-z]:\\\\?[^"<\s]*(?:web|src)\\/,
  /\/\.next\/server\//,
  /SUPABASE_SERVICE_ROLE_KEY|TURNSTILE_SECRET_KEY|IP_HASH_SALT|RESEND_API_KEY/,
  /Insecure production configuration/,
];

const ACTION_BODY = '--q\r\nContent-Disposition: form-data; name="0"\r\n\r\n["$Q1"]\r\n--q--\r\n';

const PROBES: Array<{ name: string; path: string; init?: Parameters<typeof webFetch>[1] }> = [
  { name: "404 page", path: "/no-such-page-xyz" },
  { name: "lead detail bad id", path: "/portal/leads/not-a-uuid" },
  { name: "quote bad token", path: "/q/%E0%A4%A" },
  {
    name: "api leads broken multipart",
    path: "/api/leads",
    init: { method: "POST", headers: { Origin: WEB_ORIGIN, "content-type": "multipart/form-data; boundary=zz" }, body: "--zz\r\nbroken" },
  },
  {
    name: "api leads json body",
    path: "/api/leads",
    init: { method: "POST", headers: { Origin: WEB_ORIGIN, "content-type": "application/json" }, body: "{" },
  },
  {
    name: "quote respond garbage",
    path: "/api/q/AAAA/respond",
    init: { method: "POST", headers: { Origin: WEB_ORIGIN, "content-type": "application/json" }, body: "{{{{" },
  },
  {
    name: "unknown server action",
    path: "/login",
    init: { method: "POST", headers: { Origin: WEB_ORIGIN, "Next-Action": "00".repeat(21), "content-type": "text/plain" }, body: "[]" },
  },
  {
    name: "malformed action body",
    path: "/login",
    init: {
      method: "POST",
      headers: { Origin: WEB_ORIGIN, "Next-Action": "60" + "ab".repeat(20), "content-type": "multipart/form-data; boundary=q" },
      body: ACTION_BODY,
    },
  },
];

describe("error pages do not include stack traces or env", () => {
  it.each(PROBES)("$name", async ({ path, init }) => {
    const res = await webFetch(path, init);
    const body = await res.text();
    for (const re of LEAKS) expect(re.test(body), `HTTP ${res.status} body matches ${re}`).toBe(false);
    for (const s of serverSecretValues()) expect(body.includes(s.value), `leaks ${s.name}`).toBe(false);
  });
});
