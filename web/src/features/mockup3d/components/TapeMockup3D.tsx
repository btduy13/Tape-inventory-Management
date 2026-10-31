"use client";
// Public 3D mockup: view toggle, WebGL detection, 2D fallback, client-only scene.
import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { getDictionary } from "@/i18n";
import type { RollPreset } from "../lib/geometry";
import { hasWebGL } from "../lib/webgl";
import type { MockupView } from "./MockupScene";

const MockupScene = dynamic(() => import("./MockupScene"), {
  ssr: false,
  loading: () => <p className="py-16 text-center text-sm text-neutral-500">{getDictionary().mockup3d.loading}</p>,
});

export type TapeMockup3DProps = {
  /** Live strip canvas (x = tape length, y = tape width). */
  source: HTMLCanvasElement | null;
  /** Bump to re-upload the texture when the canvas content changes. */
  version: number;
  preset: RollPreset;
  /** Tape length (mm) the source canvas represents. */
  stripLengthMm?: number;
  initialView?: MockupView;
};

function Fallback({ source, version, message }: { source: HTMLCanvasElement | null; version: number; message: string }) {
  const src = useMemo(() => {
    try {
      return source ? source.toDataURL("image/png") : null;
    } catch {
      return null;
    }
    // version marks canvas content changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source, version]);
  return (
    <div className="flex flex-col items-center gap-2 p-4">
      <p className="text-sm text-neutral-600" role="status">{message}</p>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {src && <img src={src} alt="" className="w-full rounded border border-neutral-300" />}
    </div>
  );
}

export function TapeMockup3D({ source, version, preset, stripLengthMm = 300, initialView = "roll" }: TapeMockup3DProps) {
  const t = getDictionary().mockup3d;
  const [view, setView] = useState<MockupView>(initialView);
  const [webgl, setWebgl] = useState<boolean | null>(null);

  useEffect(() => setWebgl(hasWebGL()), []);

  const fallback = <Fallback source={source} version={version} message={t.noWebgl} />;
  const tab = (v: MockupView, label: string) => (
    <button
      type="button"
      role="tab"
      aria-selected={view === v}
      onClick={() => setView(v)}
      className={`rounded-md px-3 py-1 text-sm ${view === v ? "bg-amber-700 text-white" : "border border-neutral-300"}`}
    >
      {label}
    </button>
  );

  return (
    <section aria-labelledby="mockup3d-title" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="mockup3d-title" className="text-xl font-bold">{t.title}</h2>
        <div role="tablist" className="flex gap-2">
          {tab("roll", t.roll)}
          {tab("carton", t.carton)}
        </div>
      </div>
      <div className="aspect-[4/3] w-full overflow-hidden rounded-lg border border-neutral-300 bg-stone-100">
        {webgl === null ? null : webgl ? (
          source ? (
            <MockupScene view={view} preset={preset} source={source} version={version} stripLengthMm={stripLengthMm} ariaLabel={t.sceneLabel} fallback={fallback} />
          ) : (
            <p className="py-16 text-center text-sm text-neutral-500">{t.waitingTexture}</p>
          )
        ) : (
          fallback
        )}
      </div>
      {webgl && <p className="text-xs text-neutral-500">{t.rotateHint}</p>}
    </section>
  );
}
