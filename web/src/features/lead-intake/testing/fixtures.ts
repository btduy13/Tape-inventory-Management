// Shared test fixtures (imported only by *.test.ts files).
import type { DesignJson } from "@/lib/types";
import type { LeadStore, PresetSnapshot } from "../server/lead-store";

export const PRESET_ID = "11111111-2222-4333-8444-555555555555";
export const LEAD_ID = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";

export const PRESET: PresetSnapshot = {
  id: PRESET_ID, label: "48mm x 100m", width_mm: 48, length_m: 100, thickness_mic: 45,
};

export const DESIGN: DesignJson = {
  version: 1,
  presetId: PRESET_ID,
  backgroundColor: "#ffcd00",
  textColor: "#000000",
  accentColor: "#c8102e",
  text: "CÔNG TY ABC",
  fontFamily: "Arial",
  fontSizePx: 40,
  logo: { path: null, scale: 1, offsetX: 0, offsetY: 0 },
  repeatGapPx: 20,
};

export const PNG_BYTES = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13]);
export const JPEG_BYTES = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 16, 0x4a, 0x46]);
export const SVG_TEXT = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><rect width="10" height="10" fill="#000"/></svg>';

export function validFields(): Record<string, string> {
  return {
    name: "Nguyễn Văn A",
    phone: "0912 345 678",
    email: "A@Example.vn",
    company: "Công ty ABC",
    quantity: "1.000",
    note: "Cần gấp",
  };
}

export function buildForm(overrides: Record<string, string | Blob | null> = {}): FormData {
  const fd = new FormData();
  const base: Record<string, string | Blob | null> = {
    ...validFields(),
    design: JSON.stringify(DESIGN),
    turnstileToken: "tok",
    ...overrides,
  };
  for (const [k, v] of Object.entries(base)) {
    if (v === null) continue;
    if (typeof v === "string") fd.set(k, v);
    else fd.set(k, v, k === "logo" ? "logo.bin" : "preview.png");
  }
  return fd;
}

export type FakeStore = LeadStore & {
  leads: Record<string, unknown>[];
  designs: Record<string, unknown>[];
  files: { bucket: string; path: string; contentType: string; bytes: Uint8Array }[];
  deletedLeads: string[];
  removed: string[];
};

export function fakeStore(opts: { preset?: PresetSnapshot | null; failDesign?: boolean } = {}): FakeStore {
  const s: FakeStore = {
    leads: [], designs: [], files: [], deletedLeads: [], removed: [],
    async findActivePreset(id) {
      const p = opts.preset === undefined ? PRESET : opts.preset;
      return p && p.id === id ? p : null;
    },
    async insertLead(row) {
      s.leads.push(row);
      return { id: LEAD_ID, code: "L2610-00001" };
    },
    async insertDesign(row) {
      if (opts.failDesign) throw new Error("design insert failed: 23514");
      s.designs.push(row);
    },
    async uploadFile(bucket, path, bytes, contentType) {
      s.files.push({ bucket, path, bytes, contentType });
    },
    async deleteLead(id) {
      s.deletedLeads.push(id);
    },
    async removeFiles(_bucket, paths) {
      s.removed.push(...paths);
    },
  };
  return s;
}
