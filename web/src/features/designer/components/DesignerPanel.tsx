"use client";
// Full 2D designer: sticky live preview + grouped controls + secondary export actions.
// Must be inside <DesignProvider>.
import { getDictionary } from "@/i18n";
import { ExportButtons } from "./ExportButtons";
import { LogoUpload } from "./LogoUpload";
import { MobileActionBar } from "./MobileActionBar";
import { PalettePicker } from "./PalettePicker";
import { PresetPicker } from "./PresetPicker";
import { TapeCanvas2D } from "./TapeCanvas2D";
import { TemplatePicker } from "./TemplatePicker";
import { TextTool } from "./TextTool";

export function DesignerPanel() {
  const t = getDictionary().designer;
  return (
    <section aria-labelledby="designer-title" className="flex min-w-0 flex-col gap-6">
      <h2 id="designer-title" className="text-xl font-bold">{t.title}</h2>
      <div className="sticky top-0 z-10 -mx-1 bg-white px-1 pt-1 pb-2 shadow-[0_6px_6px_-6px_rgba(0,0,0,0.15)]">
        <TapeCanvas2D />
      </div>
      <div className="flex min-w-0 flex-col gap-6">
        <PresetPicker />
        <TemplatePicker />
        <TextTool />
        <LogoUpload />
        <PalettePicker />
      </div>
      <ExportButtons />
      <MobileActionBar />
    </section>
  );
}
