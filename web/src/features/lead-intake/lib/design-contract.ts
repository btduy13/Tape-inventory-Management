// What the lead form needs from the designer at submit time. Adapted from
// features/designer `useDesignExport()` in components/DesignLeadForm.tsx; LeadForm itself
// only depends on this shape (keeps it testable without the Konva designer).
//
// The browser sends the design to POST /api/leads as multipart fields:
//   design   JSON string of DesignJson (lib/types.ts)  -> validated by design-schema.ts
//   logo     optional File (PNG/JPEG/SVG, <= 5MB)       -> re-validated server side
//   preview  optional Blob PNG of the 2D tape export    -> re-validated server side
import type { DesignJson } from "@/lib/types";

export interface LeadDesign {
  /** Current designer state. `logo.path` is ignored: the server sets it after upload. */
  designJson: DesignJson;
  /** Original logo file picked by the customer (UX-checked client side only). */
  logoFile?: File | null;
  /** PNG export of the 2D tape strip (designer `<TapeCanvas2D>` export). */
  previewPng?: Blob | null;
}

/**
 * Lead form asks the designer for the latest design at submit time (preview export is async).
 * Return null when no design was made (the form then shows an error: design is required).
 */
export type GetLeadDesign = () => Promise<LeadDesign | null>;
