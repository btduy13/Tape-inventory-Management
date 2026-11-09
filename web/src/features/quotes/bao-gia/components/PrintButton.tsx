"use client";
import { buttonClass } from "@/features/portal-ui/components/styles";

/** Browser print dialog; "Lưu thành PDF" replaces the app's "Xuất PDF" save dialog. */
export function PrintButton() {
  return (
    <button type="button" onClick={() => window.print()} className={buttonClass("primary")}>
      Xuất PDF / In
    </button>
  );
}
