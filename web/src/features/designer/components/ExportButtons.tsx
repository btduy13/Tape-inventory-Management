"use client";
import { useState } from "react";
import { getDictionary } from "@/i18n";
import { downloadBlob, exportDesignJsonBlob, exportDesignPng } from "../lib/export";
import { useDesignContext } from "./DesignProvider";

export function ExportButtons() {
  const t = getDictionary().designer;
  const { store } = useDesignContext();
  const [error, setError] = useState(false);

  async function onPng() {
    setError(false);
    try {
      downloadBlob(await exportDesignPng(store), "bang-keo-thiet-ke.png");
    } catch {
      setError(true);
    }
  }

  function onJson() {
    setError(false);
    try {
      downloadBlob(exportDesignJsonBlob(store), "bang-keo-thiet-ke.json");
    } catch {
      setError(true);
    }
  }

  const btn = "rounded-md border border-amber-700 px-3 py-2 text-sm font-semibold text-amber-800 hover:bg-amber-50";
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" onClick={() => void onPng()} className={btn}>{t.exportPng}</button>
      <button type="button" onClick={onJson} className={btn}>{t.exportJson}</button>
      {error && <p role="alert" className="text-xs text-red-700">{t.exportFailed}</p>}
    </div>
  );
}
