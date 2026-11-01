"use client";
// Public 3D mockup: view toggle, WebGL detection, 2D fallback, client-only scene.
import dynamic from "next/dynamic";
import { useMemo, useState, useSyncExternalStore } from "react";
import { getDictionary } from "@/i18n";
import type { RollPreset } from "../lib/geometry";
import { hasWebGL } from "../lib/webgl";
import type { MockupView } from "../lib/views";

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
  /** Extra classes on the outer section (place it in any layout). */
  className?: string;
  /**
   * Canvas box aspect ratio (CSS `aspect-ratio`) from the `sm` breakpoint up, e.g. "4 / 3".
   * "fill" drops the ratio so the canvas fills a parent with a definite height.
   */
  aspect?: string;
  /** Aspect ratio below the `sm` breakpoint (taller on phones). Defaults to "4 / 5". */
  mobileAspect?: string;
  /** Show the heading row title (tabs are always shown). */
  showTitle?: boolean;
};

const TOUCH_HINT = "Vuốt ngang để xoay, vuốt dọc để cuộn trang";

let webglSupport: boolean | undefined;
const cachedHasWebGL = () => (webglSupport ??= hasWebGL());
const noopSubscribe = () => () => {};

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

export function TapeMockup3D({
  source,
  version,
  preset,
  stripLengthMm = 300,
  initialView = "roll",
  className = "",
  aspect = "4 / 3",
  mobileAspect = "4 / 5",
  showTitle = true,
}: TapeMockup3DProps) {
  const t = getDictionary().mockup3d;
  const [view, setView] = useState<MockupView>(initialView);
  // null on the server / first hydration pass, then the (cached) client capability.
  const webgl = useSyncExternalStore<boolean | null>(noopSubscribe, cachedHasWebGL, () => null);

  const fill = aspect === "fill";
  const fallback = <Fallback source={source} version={version} message={t.noWebgl} />;
  const tab = (v: MockupView, label: string) => (
    <button
      type="button"
      role="tab"
      aria-selected={view === v}
      onClick={() => setView(v)}
      className={`min-h-11 min-w-11 flex-1 rounded-md px-2 py-2 text-sm leading-tight font-medium sm:px-3 transition-colors sm:flex-none ${
        view === v ? "bg-amber-700 text-white" : "border border-neutral-300 bg-white hover:bg-neutral-50"
      }`}
    >
      {label}
    </button>
  );

  return (
    <section aria-label={t.title} className={`flex min-w-0 flex-col gap-3 ${fill ? "h-full" : ""} ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        {showTitle && <h2 className="text-xl font-bold">{t.title}</h2>}
        <div role="tablist" aria-label={t.title} className="flex w-full flex-wrap gap-2 sm:w-auto">
          {tab("roll", t.roll)}
          {tab("carton", t.carton)}
          {tab("cup", t.cup)}
        </div>
      </div>
      <div
        style={fill ? undefined : ({ "--m3d-aspect": aspect, "--m3d-aspect-sm": mobileAspect } as React.CSSProperties)}
        className={`relative w-full min-w-0 overflow-hidden rounded-lg border border-neutral-300 bg-stone-100 ${
          fill ? "min-h-64 flex-1" : "aspect-(--m3d-aspect-sm) max-h-[85svh] sm:aspect-(--m3d-aspect)"
        }`}
      >
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
      {webgl && (
        <p className="text-xs text-neutral-500">
          <span className="hidden pointer-fine:inline">{t.rotateHint}</span>
          <span className="pointer-fine:hidden">{TOUCH_HINT}</span>
        </p>
      )}
    </section>
  );
}
