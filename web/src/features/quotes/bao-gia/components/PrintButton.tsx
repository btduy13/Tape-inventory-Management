"use client";
import { buttonClass, type ButtonVariant } from "@/features/portal-ui/components/styles";

/** Browser print dialog; "Lưu thành PDF" replaces the app's "Xuất PDF" save dialog. */
export function PrintButton({ variant = "primary", label = "Xuất PDF / In" }: { variant?: ButtonVariant; label?: string }) {
  return (
    <button type="button" onClick={() => window.print()} className={buttonClass(variant)}>
      {label}
    </button>
  );
}
