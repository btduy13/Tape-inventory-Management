"use client";
// Client-only wrapper: Konva touches `window` at import time, so never SSR it.
import dynamic from "next/dynamic";
import { getDictionary } from "@/i18n";

function Loading() {
  return <p className="flex aspect-[25/4] items-center justify-center rounded-md bg-slate-200/60 text-sm text-slate-600 motion-safe:animate-pulse">{getDictionary().designer.canvasLoading}</p>;
}

export const TapeCanvas2D = dynamic(() => import("./KonvaTapeStage"), { ssr: false, loading: Loading });
