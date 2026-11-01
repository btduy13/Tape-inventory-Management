"use client";
// Eyedropper UI around the 3D viewer: toggle button (next to zoom +/−), hover loupe, picked-colour
// panel, optional native screen picker (window.EyeDropper). The picking itself runs inside the
// canvas (EyedropperPolicy). No inline style attributes: the loupe is moved through CSSOM and
// colours are SVG fill attributes, so the strict CSP holds.
import { useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState, useSyncExternalStore, type Ref } from "react";
import { format, getDictionary } from "@/i18n";
import type { PickResult } from "../lib/pick";
import type { PickHandlers } from "./EyedropperPolicy";

/** Facts about a picked colour, supplied by the design owner (features/designer). */
export type PickedColorFacts = {
  swatch: { hex: string; name: string; exact: boolean };
  /** 1-based index among the counted print inks, or null. */
  inkIndex: number | null;
  isBackground: boolean;
  isText: boolean;
};

/** Optional link to the design: colour facts and "use for text / background" actions. */
export type ColorPickerBridge = {
  textColor: string;
  backgroundColor: string;
  describe(hex: string): PickedColorFacts | null;
  applyText(hex: string): void;
  applyBackground(hex: string): void;
};

type EyeDropperCtor = new () => { open(): Promise<{ sRGBHex: string }> };
const screenPicker = (): EyeDropperCtor | null =>
  typeof window !== "undefined" && "EyeDropper" in window ? (window as unknown as { EyeDropper: EyeDropperCtor }).EyeDropper : null;

const noopSubscribe = () => () => {};

export type LoupeApi = { show(pick: PickResult | null, clientX: number, clientY: number): void };

/** Small swatch + HEX that follows the pointer while picking. */
export function PickLoupe({ ref }: { ref: Ref<LoupeApi> }) {
  const box = useRef<HTMLDivElement>(null);
  const dot = useRef<SVGCircleElement>(null);
  const label = useRef<HTMLSpanElement>(null);
  useImperativeHandle(ref, () => ({
    show(pick, clientX, clientY) {
      const el = box.current;
      if (!el) return;
      if (!pick) {
        el.hidden = true;
        return;
      }
      const host = el.parentElement?.getBoundingClientRect();
      const x = clientX - (host?.left ?? 0);
      const y = clientY - (host?.top ?? 0);
      const flipX = host && x > host.width - 150;
      const flipY = host && y > host.height - 56;
      el.style.transform = `translate(${flipX ? x - 140 : x + 16}px, ${flipY ? y - 44 : y + 16}px)`;
      dot.current?.setAttribute("fill", pick.hex);
      if (label.current) label.current.textContent = pick.hex.toUpperCase();
      el.dataset.hex = pick.hex;
      el.dataset.source = pick.source;
      el.hidden = false;
    },
  }));
  return (
    <div
      ref={box}
      hidden
      data-testid="pick-loupe"
      aria-hidden="true"
      className="pointer-events-none absolute left-0 top-0 z-40 flex items-center gap-1.5 rounded-full border border-neutral-300 bg-white/95 py-1 pr-2.5 pl-1 shadow-md"
    >
      <svg width="24" height="24" viewBox="0 0 24 24">
        <circle ref={dot} cx="12" cy="12" r="10.5" stroke="#0f172a" strokeOpacity="0.35" strokeWidth="1.5" />
      </svg>
      <span ref={label} className="font-mono text-xs font-semibold tabular-nums text-neutral-900" />
    </div>
  );
}

/** Eyedropper mode state, hover / pick handlers and Esc to exit. */
export function useEyedropper() {
  const [picking, setPicking] = useState(false);
  const [pick, setPick] = useState<PickResult | null>(null);
  const loupe = useRef<LoupeApi>(null);
  const handlers = useMemo<PickHandlers>(
    () => ({
      onHover: (p, x, y) => loupe.current?.show(p, x, y),
      onPick: (p) => setPick(p),
    }),
    [],
  );
  useEffect(() => {
    if (!picking) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPicking(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [picking]);
  const pickScreen = useCallback(async () => {
    const Ctor = screenPicker();
    if (!Ctor) return;
    try {
      const r = await new Ctor().open();
      setPick({ hex: r.sRGBHex.toLowerCase(), source: "screen" });
    } catch {
      // cancelled (Esc) or blocked: nothing to do
    }
  }, []);
  return { picking, setPicking, pick, setPick, loupe, handlers, pickScreen };
}

export function EyedropperToggle({ active, onToggle }: { active: boolean; onToggle: () => void }) {
  const t = getDictionary().mockup3d;
  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={t.pickToggle}
      title={t.pickToggle}
      data-testid="pick-toggle"
      onClick={onToggle}
      className={`grid size-11 place-items-center border-t border-neutral-300 focus-visible:outline-2 focus-visible:outline-vt-navy ${
        active ? "bg-vt-navy text-white" : "text-vt-navy hover:bg-neutral-100"
      }`}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="m2 22 1-1h3l9-9" />
        <path d="M3 21v-3l9-9" />
        <path d="m15 6 3.4-3.4a2.1 2.1 0 1 1 3 3L18 9l.4.4a2.1 2.1 0 1 1-3 3l-3.8-3.8a2.1 2.1 0 1 1 3-3l.4.4Z" />
      </svg>
    </button>
  );
}

/** Hint row shown while picking (+ the native screen picker when the browser has one). */
export function PickHint({ onScreen }: { onScreen: () => void }) {
  const t = getDictionary().mockup3d;
  const hasScreen = useSyncExternalStore(noopSubscribe, () => screenPicker() !== null, () => false);
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md bg-vt-navy/5 px-3 py-2 text-xs text-neutral-800">
      <span className="hidden pointer-fine:inline">{t.pickHint}</span>
      <span className="pointer-fine:hidden">{t.pickHintTouch}</span>
      {hasScreen && (
        <button type="button" onClick={onScreen} className="min-h-11 rounded-md px-2 font-medium text-vt-navy underline underline-offset-2 hover:bg-white focus-visible:outline-2 focus-visible:outline-vt-navy">
          {t.pickScreen}
        </button>
      )}
    </div>
  );
}

const btn =
  "min-h-11 rounded-md border border-neutral-300 bg-white px-3 text-sm font-medium text-neutral-900 hover:bg-neutral-50 focus-visible:outline-2 focus-visible:outline-vt-navy disabled:cursor-not-allowed disabled:opacity-50";

/** Picked colour: swatch, HEX, source, nearest named swatch, ink status, actions. */
export function PickPanel({ pick, bridge, onClose }: { pick: PickResult; bridge?: ColorPickerBridge | null; onClose: () => void }) {
  const t = getDictionary().mockup3d;
  const [status, setStatus] = useState<{ hex: string; text: string } | null>(null);
  const hex = pick.hex;
  const facts = bridge?.describe(hex) ?? null;
  const source = pick.source === "design" ? t.pickSourceDesign : pick.source === "render" ? t.pickSourceRender : t.pickSourceScreen;
  const ink = facts ? (facts.isBackground ? t.pickBackground : facts.inkIndex ? format(t.pickInk, { n: facts.inkIndex }) : t.pickNotInk) : null;
  const shownStatus = status?.hex === hex ? status.text : null;
  const sameBg = bridge ? hex === bridge.backgroundColor.toLowerCase() : false;
  const sameText = bridge ? hex === bridge.textColor.toLowerCase() : false;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(hex.toUpperCase());
      setStatus({ hex, text: format(t.pickCopied, { hex: hex.toUpperCase() }) });
    } catch {
      setStatus({ hex, text: format(t.pickCopyFailed, { hex: hex.toUpperCase() }) });
    }
  };

  return (
    <section aria-label={t.pickTitle} data-testid="pick-panel" data-hex={hex} data-source={pick.source} data-px={pick.pixel?.x} data-py={pick.pixel?.y} className="flex flex-col gap-3 rounded-lg border border-neutral-300 bg-white p-3">
      <div className="flex items-start gap-3">
        <svg width="44" height="44" viewBox="0 0 44 44" className="shrink-0" role="img" aria-label={hex.toUpperCase()}>
          <rect x="0.75" y="0.75" width="42.5" height="42.5" rx="8" fill={hex} stroke="#0f172a" strokeOpacity="0.25" strokeWidth="1.5" />
        </svg>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5 text-sm" aria-live="polite" aria-atomic="true">
          <p className="flex flex-wrap items-baseline gap-x-2">
            <span className="font-mono font-semibold tabular-nums text-neutral-900" data-testid="pick-hex">{hex.toUpperCase()}</span>
            <span className="text-xs text-neutral-600">{source}</span>
          </p>
          {facts && (
            <p className="flex items-center gap-1.5 text-xs text-neutral-700">
              <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
                <circle cx="6" cy="6" r="5.25" fill={facts.swatch.hex} stroke="#94a3b8" />
              </svg>
              {format(facts.swatch.exact ? t.pickExact : t.pickNearest, { name: facts.swatch.name })}
            </p>
          )}
          {ink && <p className="text-xs text-neutral-700" data-testid="pick-ink">{ink}</p>}
          {shownStatus && <p className="text-xs font-medium text-emerald-800">{shownStatus}</p>}
        </div>
        <button type="button" onClick={onClose} aria-label={t.pickClose} title={t.pickClose} className="-mt-1 -mr-1 grid size-11 shrink-0 place-items-center rounded-md text-neutral-600 hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-vt-navy">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {bridge && (
          <>
            <button
              type="button"
              className={btn}
              disabled={sameBg}
              title={sameBg ? t.pickSameAsBackground : undefined}
              onClick={() => {
                bridge.applyText(hex);
                setStatus({ hex, text: format(t.pickAppliedText, { hex: hex.toUpperCase() }) });
              }}
            >
              {t.pickUseText}
            </button>
            <button
              type="button"
              className={btn}
              disabled={sameText}
              title={sameText ? t.pickSameAsText : undefined}
              onClick={() => {
                bridge.applyBackground(hex);
                setStatus({ hex, text: format(t.pickAppliedBackground, { hex: hex.toUpperCase() }) });
              }}
            >
              {t.pickUseBackground}
            </button>
          </>
        )}
        <button type="button" className={btn} onClick={copy}>
          {t.pickCopy}
        </button>
      </div>
    </section>
  );
}
