// Rule: POST /api/q/<token>/respond only accepts same-origin JSON requests. Cross-origin,
// missing Origin (and no same-origin Referer), and CORS-simple content types are refused
// before the token is touched; no CORS grant is ever returned to a foreign origin.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { BASE_ORIGIN, BASE_URL } from "../helpers/env";
import { postJson, postRaw } from "../helpers/http";
import { cleanupTestData, createSentQuote, getQuoteRow, getTokens, respondPath } from "../helpers/quotes";

describe("quotes: cross-origin and Origin-less POSTs are refused", () => {
  let fx: Awaited<ReturnType<typeof createSentQuote>>;
  const port = new URL(BASE_URL).port || "80";

  beforeAll(async () => {
    fx = await createSentQuote();
  });
  afterAll(cleanupTestData);

  const bad: Array<[string, Record<string, string> | null, Record<string, string>]> = [
    ["foreign origin", { origin: "https://evil.example" }, {}],
    ["origin null (sandboxed iframe / file:)", { origin: "null" }, {}],
    ["look-alike host suffix", { origin: `http://localhost:${port}.evil.example` }, {}],
    ["other port on localhost", { origin: `http://localhost:${Number(port) + 1}` }, {}],
    ["https scheme of same host", { origin: BASE_ORIGIN.replace(/^http:/, "https:") }, {}],
    ["no Origin, no Referer", null, {}],
    ["no Origin, foreign Referer", null, { referer: "https://evil.example/page" }],
    ["no Origin, garbage Referer", null, { referer: "not a url" }],
  ];

  it.each(bad)("%s -> 403 forbidden", async (_name, originHdr, extra) => {
    const r = await postJson(respondPath(fx.token), { action: "accept" }, {
      origin: originHdr ? originHdr.origin : null,
      headers: extra,
    });
    expect(r.status).toBe(403);
    expect(r.json).toEqual({ ok: false, error: "forbidden" });
    expect(r.headers.get("access-control-allow-origin")).toBeNull();
  });

  it.each([
    ["text/plain"],
    ["application/x-www-form-urlencoded"],
    ["multipart/form-data; boundary=x"],
  ])("same-origin CORS-simple content type %s -> 415", async (ct) => {
    const r = await postRaw(respondPath(fx.token), {
      headers: { "content-type": ct },
      body: ct.startsWith("multipart")
        ? '--x\r\nContent-Disposition: form-data; name="action"\r\n\r\naccept\r\n--x--\r\n'
        : ct === "text/plain"
          ? JSON.stringify({ action: "accept" })
          : "action=accept",
    });
    expect(r.status).toBe(415);
  });

  it("preflight from a foreign origin gets no CORS grant", async () => {
    const res = await fetch(`${BASE_URL}${respondPath(fx.token)}`, {
      method: "OPTIONS",
      headers: {
        origin: "https://evil.example",
        "access-control-request-method": "POST",
        "access-control-request-headers": "content-type",
      },
    });
    expect(res.headers.get("access-control-allow-origin")).toBeNull();
    expect(res.headers.get("access-control-allow-credentials")).toBeNull();
  });

  it("refused requests did not consume the token; a same-origin answer still works", async () => {
    expect((await getQuoteRow(fx.quoteId)).status).toBe("sent");
    expect((await getTokens(fx.quoteId))[0]!.revoked_at).toBeNull();
    const ok = await postJson(respondPath(fx.token), { action: "accept" }, { origin: BASE_ORIGIN });
    expect(ok.status).toBe(200);
  });
});
