"use client";
import { useState } from "react";
import { getDictionary } from "@/i18n";
import { downloadBlob, exportDesignJsonBlob, exportDesignPng } from "../lib/export";
import { useDesignContext } from "./DesignProvider";
import { btnGhost } from "./ui";

function DownloadIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 4v11" /><path d="m7 10 5 5 5-5" /><path d="M5 20h14" />
    </svg>
  );
}

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

  return (
    <div className="flex flex-wrap items-center gap-1" aria-label={t.exportGroup} role="group">
      <button type="button" onClick={() => void onPng()} className={`${btnGhost} px-2.5`}>
        <DownloadIcon />
        {t.exportPng}
      </button>
      <button type="button" onClick={onJson} className={`${btnGhost} px-2.5`}>
        <DownloadIcon />
        {t.exportJson}
      </button>
      {error && <p role="alert" className="text-xs font-medium text-red-700">{t.exportFailed}</p>}
    </div>
  );
}
