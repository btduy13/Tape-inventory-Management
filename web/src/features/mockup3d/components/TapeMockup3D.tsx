"use client";
// Public 3D mockup: view toggle, WebGL detection, 2D fallback, client-only scene.
import dynamic from "next/dynamic";
import { useMemo, useState, useSyncExternalStore } from "react";
import { getDictionary } from "@/i18n";
import { CUP_MM, CUP_STRIP_MAX_MM, cupStripCapped } from "../lib/cup";
import { CARTON_MM, MM_PER_UNIT, rollGeometry, type RollPreset } from "../lib/geometry";
import { hasWebGL } from "../lib/webgl";
import type { MockupView } from "../lib/views";
import { EyedropperToggle, PickHint, PickLoupe, PickPanel, useEyedropper, type ColorPickerBridge } from "./Eyedropper";
import { Watermark } from "./Watermark";
import { VIEWER_ATTR, ZOOM_EVENT } from "../lib/zoom";

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
  aspect?: MockupAspect | "fill";
  /** Aspect ratio below the `sm` breakpoint (taller on phones). Defaults to "4 / 5". */
  mobileAspect?: MockupAspect;
  /** Show the heading row title (tabs are always shown). */
  showTitle?: boolean;
  /**
   * Enables the eyedropper ("Chọn màu" next to zoom). With a bridge the picked-colour panel also
   * shows the nearest swatch / ink status and "use for text / background" actions.
   */
  colorPicker?: ColorPickerBridge | null;
};

/** Supported canvas ratios. Fixed Tailwind classes (no inline style: CSP style-src is nonce-only). */
export type MockupAspect = "16 / 9" | "4 / 3" | "1 / 1" | "4 / 5" | "3 / 4";
const ASPECT_SM: Record<MockupAspect, string> = {
  "16 / 9": "sm:aspect-video",
  "4 / 3": "sm:aspect-[4/3]",
  "1 / 1": "sm:aspect-square",
  "4 / 5": "sm:aspect-[4/5]",
  "3 / 4": "sm:aspect-[3/4]",
};
const ASPECT_BASE: Record<MockupAspect, string> = {
  "16 / 9": "aspect-video",
  "4 / 3": "aspect-[4/3]",
  "1 / 1": "aspect-square",
  "4 / 5": "aspect-[4/5]",
  "3 / 4": "aspect-[3/4]",
};

const TOUCH_HINT = "Vuốt ngang để xoay, chụm 2 ngón để phóng to, vuốt dọc để cuộn trang";
const ZOOM_HINT = "Ctrl + cuộn chuột hoặc nút +/− để phóng to";
const ZOOM_STEP = 0.8;

/** Dispatches a zoom request to the ZoomPolicy inside the canvas (factor < 1 = closer). */
function zoom(button: HTMLElement, factor: number) {
  button.closest(`[${VIEWER_ATTR}]`)?.dispatchEvent(new CustomEvent(ZOOM_EVENT, { detail: factor }));
}
export const MOCKUP_DISCLAIMER = "Hình ảnh chỉ là minh họa và tham khảo, không thể hiện đúng màu sắc thực tế";

const cm = (mm: number) => `${+(mm / 10).toFixed(1)}`.replace(".", ",");

/** True-scale caption: real sizes of what is shown (same mm system in every view). */
function scaleNote(view: MockupView, preset: RollPreset): string {
  const g = rollGeometry(preset);
  const roll = `cuộn Ø${Math.round(g.outerRadius * 2 * MM_PER_UNIT)} mm × ${preset.width_mm} mm`;
  if (view === "carton") return `Tỉ lệ thật: thùng ${cm(CARTON_MM.length)} × ${cm(CARTON_MM.depth)} × ${cm(CARTON_MM.height)} cm, ${roll}`;
  if (view === "cup") {
    const note = `Tỉ lệ thật: ly 500 ml (Ø${2 * CUP_MM.rimRadius} × ${CUP_MM.height} mm)`;
    return cupStripCapped(preset.width_mm)
      ? `${note}; ly chỉ dán vừa băng tối đa ${CUP_STRIP_MAX_MM} mm nên băng ${preset.width_mm} mm được hiển thị rộng ${CUP_STRIP_MAX_MM} mm`
      : `${note}, băng ${preset.width_mm} mm`;
  }
  return `Tỉ lệ thật: ${roll}, lõi Ø76 mm`;
}

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
  colorPicker,
}: TapeMockup3DProps) {
  const t = getDictionary().mockup3d;
  const [view, setView] = useState<MockupView>(initialView);
  const { picking, setPicking, pick, setPick, loupe, handlers: pickHandlers, pickScreen } = useEyedropper();
  const pickerOn = colorPicker !== undefined && picking;
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
      className={`min-h-11 min-w-11 flex-auto whitespace-nowrap rounded-md px-2 py-2 text-sm leading-tight font-medium sm:px-3 transition-colors sm:flex-none ${
        view === v ? "bg-vt-navy text-white" : "border border-neutral-300 bg-white hover:bg-neutral-50"
      }`}
    >
      {label}
    </button>
  );

  return (
    <section aria-label={t.title} className={`flex min-w-0 flex-col gap-3 ${fill ? "h-full" : ""} ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        {showTitle && <h2 className="text-xl font-bold">{t.title}</h2>}
        <div role="tablist" aria-label={t.title} className="flex w-full gap-2 overflow-x-auto sm:w-auto">
          {tab("roll", t.roll)}
          {tab("carton", t.carton)}
          {tab("cup", t.cup)}
        </div>
      </div>
      <div
        // Discourage "save image" on the bare canvas: the watermark lives in the overlay.
        onContextMenu={(e) => e.preventDefault()}
        {...{ [VIEWER_ATTR]: "" }}
        className={`relative isolate w-full min-w-0 overflow-hidden rounded-lg border border-neutral-300 bg-stone-100 ${
          aspect === "fill" ? "min-h-64 flex-1" : `${ASPECT_BASE[mobileAspect]} max-h-[85svh] ${ASPECT_SM[aspect]}`
        }`}
      >
        {webgl === null ? null : webgl ? (
          source ? (
            <MockupScene
              view={view}
              preset={preset}
              source={source}
              version={version}
              stripLengthMm={stripLengthMm}
              ariaLabel={t.sceneLabel}
              fallback={fallback}
              picking={pickerOn}
              pickHandlers={colorPicker !== undefined ? pickHandlers : undefined}
            />
          ) : (
            <p className="py-16 text-center text-sm text-neutral-500">{t.waitingTexture}</p>
          )
        ) : (
          fallback
        )}
        <Watermark />
        {webgl && source && (
          <div className="absolute right-2 top-2 z-30 flex flex-col overflow-hidden rounded-md border border-neutral-300 bg-white/90 shadow-sm">
            {[
              { label: "Phóng to", text: "+", factor: ZOOM_STEP },
              { label: "Thu nhỏ", text: "−", factor: 1 / ZOOM_STEP },
            ].map((b) => (
              <button
                key={b.text}
                type="button"
                aria-label={b.label}
                title={b.label}
                onClick={(e) => zoom(e.currentTarget, b.factor)}
                className="grid size-11 place-items-center text-xl font-semibold text-vt-navy hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-vt-navy"
              >
                {b.text}
              </button>
            ))}
            {colorPicker !== undefined && <EyedropperToggle active={pickerOn} onToggle={() => setPicking((p) => !p)} />}
          </div>
        )}
        {colorPicker !== undefined && <PickLoupe ref={loupe} />}
        {/* sm+: drawn inside the viewer; phones: below the canvas so it never covers the scene. */}
        <p className="pointer-events-none absolute inset-x-0 bottom-0 z-20 hidden bg-white/85 px-3 py-1.5 text-center text-xs leading-snug text-neutral-700 sm:block">
          {MOCKUP_DISCLAIMER}
        </p>
      </div>
      <p className="-mt-1 text-center text-[11px] leading-snug text-neutral-700 sm:hidden">{MOCKUP_DISCLAIMER}</p>
      {pickerOn && <PickHint onScreen={pickScreen} />}
      {colorPicker !== undefined && pick && <PickPanel pick={pick} bridge={colorPicker} onClose={() => setPick(null)} />}
      <p className="text-xs text-neutral-600" aria-live="polite">
        {scaleNote(view, preset)}
        {webgl && (
          <>
            {" · "}
            <span className="hidden pointer-fine:inline">{t.rotateHint} · {ZOOM_HINT}</span>
            <span className="pointer-fine:hidden">{TOUCH_HINT}</span>
          </>
        )}
      </p>
    </section>
  );
}
