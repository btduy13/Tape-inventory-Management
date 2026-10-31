"use client";
// Client-only wrapper: Konva touches `window` at import time, so never SSR it.
import dynamic from "next/dynamic";
import { getDictionary } from "@/i18n";

function Loading() {
  return <p className="py-8 text-center text-sm text-neutral-500">{getDictionary().designer.canvasLoading}</p>;
}

export const TapeCanvas2D = dynamic(() => import("./KonvaTapeStage"), { ssr: false, loading: Loading });
