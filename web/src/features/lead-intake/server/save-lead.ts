// Writes lead + design + files. On any failure after the lead insert, it rolls back
// (deletes uploaded files and the lead) so staff never see half-written requests.
import "server-only";
import { STORAGE_BUCKETS } from "@/lib/types";
import { randomToken } from "@/lib/security/hash";
import { designColors } from "../lib/design-schema";
import type { ParsedSubmission } from "./parse-submission";
import type { LeadStore, PresetSnapshot } from "./lead-store";

export class UnknownPresetError extends Error {
  constructor() {
    super("Preset not found or inactive");
    this.name = "UnknownPresetError";
  }
}

export type SavedLead = {
  id: string;
  code: string;
  preset: PresetSnapshot;
  logoPath: string | null;
  previewPath: string | null;
};

export type SaveMeta = { ipHash: string | null; userAgent: string | null };

export async function saveLead(
  store: LeadStore,
  input: ParsedSubmission,
  meta: SaveMeta,
): Promise<SavedLead> {
  const preset = await store.findActivePreset(input.design.presetId);
  if (!preset) throw new UnknownPresetError();

  const { fields, design } = input;
  const lead = await store.insertLead({
    customer_name: fields.name,
    phone: fields.phone,
    email: fields.email,
    company: fields.company,
    quantity: fields.quantity,
    customer_note: fields.note,
    source_ip_hash: meta.ipHash,
    user_agent: meta.userAgent ? meta.userAgent.slice(0, 300) : null,
  });

  const uploaded: { bucket: (typeof STORAGE_BUCKETS)[keyof typeof STORAGE_BUCKETS]; path: string }[] = [];
  try {
    let logoPath: string | null = null;
    if (input.logo) {
      logoPath = `${lead.id}/logo-${randomToken(8)}.${input.logo.extension}`;
      await store.uploadFile(STORAGE_BUCKETS.logos, logoPath, input.logo.bytes, input.logo.contentType);
      uploaded.push({ bucket: STORAGE_BUCKETS.logos, path: logoPath });
    }
    let previewPath: string | null = null;
    if (input.preview) {
      previewPath = `${lead.id}/preview-${randomToken(8)}.png`;
      await store.uploadFile(STORAGE_BUCKETS.previews, previewPath, input.preview.bytes, "image/png");
      uploaded.push({ bucket: STORAGE_BUCKETS.previews, path: previewPath });
    }

    await store.insertDesign({
      lead_id: lead.id,
      preset_id: preset.id,
      width_mm: preset.width_mm,
      length_m: preset.length_m,
      thickness_mic: preset.thickness_mic,
      colors: designColors(design),
      print_text: design.text === "" ? null : design.text,
      design_json: { ...design, logo: design.logo ? { ...design.logo, path: logoPath } : null },
      logo_path: logoPath,
      preview_path: previewPath,
    });

    return { id: lead.id, code: lead.code, preset, logoPath, previewPath };
  } catch (err) {
    await Promise.allSettled([
      ...uploaded.map((f) => store.removeFiles(f.bucket, [f.path])),
      store.deleteLead(lead.id),
    ]);
    throw err;
  }
}
