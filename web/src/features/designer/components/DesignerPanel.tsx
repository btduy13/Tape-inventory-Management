"use client";
// Full 2D designer: controls + live strip preview + export. Must be inside <DesignProvider>.
import { getDictionary } from "@/i18n";
import { ExportButtons } from "./ExportButtons";
import { LogoUpload } from "./LogoUpload";
import { PalettePicker } from "./PalettePicker";
import { PresetPicker } from "./PresetPicker";
import { TapeCanvas2D } from "./TapeCanvas2D";
import { TextTool } from "./TextTool";

export function DesignerPanel() {
  const t = getDictionary().designer;
  return (
    <section aria-labelledby="designer-title" className="flex flex-col gap-6">
      <h2 id="designer-title" className="text-xl font-bold">{t.title}</h2>
      <TapeCanvas2D />
      <ExportButtons />
      <div className="grid gap-6 md:grid-cols-2">
        <div className="flex flex-col gap-6">
          <PresetPicker />
          <TextTool />
        </div>
        <div className="flex flex-col gap-6">
          <PalettePicker />
          <LogoUpload />
        </div>
      </div>
    </section>
  );
}
