// Test data built through the service role: dedicated users, leads, designs, quotes, notes,
// logo objects. Every suite creates its own rows and removes them in afterAll, so suites can
// run in parallel and never depend on (or mutate) the seed leads.
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { SERVICE_KEY, SUPABASE_URL } from "./env";
import { actorFor, type Actor, type LooseDb } from "./sessions";

let svc: LooseDb | null = null;

/** Service-role client without the generated `Database` types. Setup / assertions only. */
export function looseService(): LooseDb {
  if (!SERVICE_KEY) throw new Error("[security suite] SUPABASE_SERVICE_ROLE_KEY missing in web/.env.local");
  svc ??= createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  }) as LooseDb;
  return svc;
}

function must<T>(res: { data: T | null; error: { message: string } | null }, what: string): T {
  if (res.error) throw new Error(`[security fixture] ${what}: ${res.error.message}`);
  return res.data as T;
}

export type AppRole = "admin" | "manager" | "staff" | "ctv" | "workshop";

/** Fixed password for suite-owned accounts (local Docker Supabase only). */
export const FIXTURE_PASSWORD = "sec-fixture-Passw0rd-2026";

/**
 * Find-or-create a suite-owned user (`<label>@security.local.test`) with the given role.
 * Idempotent: on every call the profile is reset to `role` and `is_active = true`.
 */
export async function ensureUser(label: string, role: AppRole): Promise<{ id: string; email: string }> {
  const db = looseService();
  const email = `sec-${label}@security.local.test`.toLowerCase();
  const created = await db.auth.admin.createUser({
    email,
    password: FIXTURE_PASSWORD,
    email_confirm: true,
    app_metadata: { role },
    user_metadata: { full_name: `Security ${label}` },
  });
  let id = created.data.user?.id;
  if (!id) {
    const found = must(await db.from("profiles").select("id").eq("email", email).maybeSingle(), `find ${email}`) as {
      id: string;
    } | null;
    if (!found) throw new Error(`[security fixture] createUser ${email}: ${created.error?.message}`);
    id = found.id;
    const reset = await db.auth.admin.updateUserById(id, { app_metadata: { role }, ban_duration: "none" });
    if (reset.error) throw new Error(`[security fixture] reset user ${email}: ${reset.error.message}`);
  }
  must(await db.from("profiles").update({ role, is_active: true }).eq("id", id).select("id"), "reset profile");
  return { id, email };
}

export async function fixtureActor(label: string, role: AppRole): Promise<Actor> {
  const u = await ensureUser(label, role);
  return actorFor(label, u.email, FIXTURE_PASSWORD);
}

export async function setActive(userId: string, active: boolean): Promise<void> {
  must(await looseService().from("profiles").update({ is_active: active }).eq("id", userId).select("id"), "setActive");
}

/** Lead + design, optionally assigned (status moves new -> assigned through the trigger). */
export async function createLead(opts: { assignedTo?: string | null; tag?: string } = {}): Promise<string> {
  const db = looseService();
  const tag = opts.tag ?? "access";
  const lead = must(
    await db
      .from("leads")
      .insert({
        customer_name: `SEC ${tag} ${randomUUID().slice(0, 8)}`,
        phone: "0900000000",
        email: "sec-customer@example.com",
        company: "SEC Co",
        quantity: 10,
        customer_note: "security suite fixture",
      })
      .select("id")
      .single(),
    "insert lead",
  ) as { id: string };
  const preset = must(await db.from("tape_presets").select("*").limit(1).single(), "preset") as Record<string, unknown>;
  must(
    await db.from("designs").insert({
      lead_id: lead.id,
      preset_id: preset.id,
      width_mm: preset.width_mm,
      length_m: preset.length_m,
      thickness_mic: preset.thickness_mic,
      colors: ["#c8a165"],
      print_text: "SEC",
      design_json: { version: 1 },
      logo_path: `${lead.id}/logo.png`,
    }),
    "insert design",
  );
  if (opts.assignedTo) {
    must(await db.from("leads").update({ assigned_to: opts.assignedTo }).eq("id", lead.id).select("id"), "assign");
  }
  return lead.id;
}

/** Draft quote with one price line (inserted as server code). */
export async function createQuote(leadId: string, status: "draft" | "sent" = "draft"): Promise<{ quoteId: string; lineId: string }> {
  const db = looseService();
  const { data: versions } = await db.from("quotes").select("version").eq("lead_id", leadId);
  const version = (versions ?? []).reduce((m: number, r: { version: number }) => Math.max(m, r.version), 0) + 1;
  const quote = must(
    await db.from("quotes").insert({ lead_id: leadId, version, vat_percent: 8 }).select("id").single(),
    "insert quote",
  ) as { id: string };
  const line = must(
    await db
      .from("quote_lines")
      .insert({ quote_id: quote.id, description: "SEC tape", quantity: 10, unit_price: 1000 })
      .select("id")
      .single(),
    "insert line",
  ) as { id: string };
  if (status === "sent") {
    must(await db.from("quotes").update({ status: "sent", sent_at: new Date().toISOString() }).eq("id", quote.id).select("id"), "send");
  }
  return { quoteId: quote.id, lineId: line.id };
}

export async function addNote(leadId: string, body = "SEC internal note"): Promise<number> {
  const row = must(
    await looseService().from("lead_notes").insert({ lead_id: leadId, author_id: null, body }).select("id").single(),
    "insert note",
  ) as { id: number };
  return row.id;
}

/** 1x1 transparent PNG. */
export const PNG_1PX = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64",
);

export async function uploadLogo(leadId: string, name = "logo.png"): Promise<string> {
  const objectPath = `${leadId}/${name}`;
  must(
    await looseService().storage.from("logos").upload(objectPath, PNG_1PX, { contentType: "image/png", upsert: true }),
    "upload logo",
  );
  return objectPath;
}

/** Removes leads (designs, quotes, logs and notes cascade) and their storage objects. */
export async function cleanupLeads(leadIds: string[]): Promise<void> {
  const db = looseService();
  for (const id of leadIds) {
    for (const bucket of ["logos", "previews", "quotes"]) {
      const { data } = await db.storage.from(bucket).list(id);
      if (data?.length) await db.storage.from(bucket).remove(data.map((o) => `${id}/${o.name}`));
    }
  }
  if (leadIds.length) await db.from("leads").delete().in("id", leadIds);
}

/** Poll until `fn` returns true or the timeout passes. */
export async function waitFor(fn: () => boolean, timeoutMs = 10_000): Promise<boolean> {
  const end = Date.now() + timeoutMs;
  while (Date.now() < end) {
    if (fn()) return true;
    await new Promise((r) => setTimeout(r, 100));
  }
  return fn();
}
