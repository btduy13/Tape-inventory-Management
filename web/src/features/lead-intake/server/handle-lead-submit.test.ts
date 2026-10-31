import { describe, expect, it, vi } from "vitest";
import { handleLeadSubmit, type LeadSubmitDeps } from "./handle-lead-submit";
import { MAX_BODY_BYTES } from "../lib/api-contract";
import type { LeadNotifier } from "../lib/email-contract";
import { buildForm, fakeStore, LEAD_ID, PNG_BYTES, SVG_TEXT, type FakeStore } from "../testing/fixtures";

const URL_ = "https://bangkeo.test/api/leads";

function request(body: FormData | string, headers: Record<string, string> = {}): Request {
  return new Request(URL_, {
    method: "POST",
    body,
    headers: { origin: "https://bangkeo.test", "user-agent": "vitest", ...headers },
  });
}

function makeDeps(over: Partial<LeadSubmitDeps> = {}, store: FakeStore = fakeStore()) {
  const notifier: LeadNotifier = {
    sendAdminNewLead: vi.fn(async () => {}),
    sendCustomerConfirmation: vi.fn(async () => {}),
  };
  const deps: LeadSubmitDeps = {
    isSameOrigin: () => true,
    checkRateLimit: vi.fn(async () => true),
    verifyCaptcha: vi.fn(async (t) => t === "tok"),
    hashClientIp: async () => "iphash",
    store,
    notifier,
    ...over,
  };
  return { deps, store, notifier };
}

describe("handleLeadSubmit", () => {
  it("creates lead + design, uploads files under <lead_id>/ and sends emails", async () => {
    const { deps, store, notifier } = makeDeps();
    const form = buildForm({ logo: new Blob([SVG_TEXT]), preview: new Blob([PNG_BYTES]) });
    const res = await handleLeadSubmit(request(form), deps);

    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ ok: true, code: "L2610-00001" });
    expect(store.leads[0]).toMatchObject({
      customer_name: "Nguyễn Văn A", phone: "0912345678", quantity: 1000,
      source_ip_hash: "iphash", user_agent: "vitest",
    });
    expect(store.files.map((f) => f.bucket)).toEqual(["logos", "previews"]);
    expect(store.files.every((f) => f.path.startsWith(`${LEAD_ID}/`))).toBe(true);
    const design = store.designs[0] as Record<string, unknown> & { design_json: { logo: { path: string } } };
    expect(design).toMatchObject({ width_mm: 48, colors: ["#ffcd00", "#000000", "#c8102e"] });
    expect(design.design_json.logo.path).toBe(store.files[0]!.path);
    expect(notifier.sendAdminNewLead).toHaveBeenCalledOnce();
    expect(notifier.sendCustomerConfirmation).toHaveBeenCalledOnce();
  });

  it("blocks cross-site requests before rate limiting", async () => {
    const { deps } = makeDeps({ isSameOrigin: () => false });
    const res = await handleLeadSubmit(request(buildForm()), deps);
    expect(res.status).toBe(403);
    expect(deps.checkRateLimit).not.toHaveBeenCalled();
  });

  it("returns 429 when rate limited, before reading the body or Turnstile", async () => {
    const { deps } = makeDeps({ checkRateLimit: vi.fn(async () => false) });
    const res = await handleLeadSubmit(request(buildForm()), deps);
    expect(res.status).toBe(429);
    expect(deps.verifyCaptcha).not.toHaveBeenCalled();
  });

  it("rejects a failed captcha without touching the DB", async () => {
    const { deps, store } = makeDeps();
    const res = await handleLeadSubmit(request(buildForm({ turnstileToken: "bad" })), deps);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("captcha");
    expect(store.leads).toHaveLength(0);
  });

  it("returns field errors on validation failure", async () => {
    const { deps, store } = makeDeps();
    const res = await handleLeadSubmit(request(buildForm({ phone: "abc" })), deps);
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.error).toBe("validation");
    expect(body.fields.phone).toBeTruthy();
    expect(store.leads).toHaveLength(0);
  });

  it("rejects non-image logos by magic bytes", async () => {
    const { deps } = makeDeps();
    const form = buildForm({ logo: new Blob(["<html>hi</html>"], { type: "image/png" }) });
    const res = await handleLeadSubmit(request(form), deps);
    expect(res.status).toBe(415);
  });

  it("rejects bodies over the cap", async () => {
    const { deps } = makeDeps();
    const form = buildForm({ logo: new Blob([new Uint8Array(MAX_BODY_BYTES + 10)]) });
    const res = await handleLeadSubmit(request(form), deps);
    expect(res.status).toBe(413);
  });

  it("rejects non-multipart bodies", async () => {
    const { deps } = makeDeps();
    const res = await handleLeadSubmit(request("{}", { "content-type": "application/json" }), deps);
    expect(res.status).toBe(422);
  });

  it("fakes success for honeypot hits and stores nothing", async () => {
    const { deps, store } = makeDeps();
    const res = await handleLeadSubmit(request(buildForm({ website: "http://spam" })), deps);
    expect(res.status).toBe(201);
    expect(store.leads).toHaveLength(0);
    expect(deps.verifyCaptcha).not.toHaveBeenCalled();
  });

  it("returns design error for an unknown / inactive preset", async () => {
    const { deps, store } = makeDeps({}, fakeStore({ preset: null }));
    const res = await handleLeadSubmit(request(buildForm()), deps);
    expect(res.status).toBe(422);
    expect((await res.json()).error).toBe("design");
    expect(store.leads).toHaveLength(0);
  });

  it("rolls back lead and files when the design insert fails", async () => {
    const { deps, store } = makeDeps({}, fakeStore({ failDesign: true }));
    vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await handleLeadSubmit(request(buildForm({ preview: new Blob([PNG_BYTES]) })), deps);
    expect(res.status).toBe(500);
    expect(store.deletedLeads).toEqual([LEAD_ID]);
    expect(store.removed).toEqual([store.files[0]!.path]);
  });

  it("still succeeds when emails fail, and skips customer mail without email", async () => {
    const { deps, notifier } = makeDeps();
    vi.mocked(notifier.sendAdminNewLead).mockRejectedValueOnce(new Error("smtp down"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await handleLeadSubmit(request(buildForm({ email: "" })), deps);
    expect(res.status).toBe(201);
    expect(notifier.sendCustomerConfirmation).not.toHaveBeenCalled();
  });
});
