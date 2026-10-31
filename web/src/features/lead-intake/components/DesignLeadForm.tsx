"use client";
// LeadForm wired to the designer: must be rendered inside features/designer <DesignProvider>.
import { useCallback } from "react";
import { useDesignExport } from "@/features/designer";
import type { GetLeadDesign } from "../lib/design-contract";
import { LeadForm, type LeadFormProps } from "./LeadForm";

export function DesignLeadForm(props: Omit<LeadFormProps, "getDesign">) {
  const design = useDesignExport();
  const getDesign = useCallback<GetLeadDesign>(async () => {
    const designJson = design.getDesignJson();
    if (!designJson.presetId) return null;
    // Preview is optional: a missing canvas must not block the quote request.
    const previewPng = await design.getPngBlob().catch(() => null);
    return { designJson, logoFile: design.getLogoFile(), previewPng };
  }, [design]);
  return <LeadForm {...props} getDesign={getDesign} />;
}
