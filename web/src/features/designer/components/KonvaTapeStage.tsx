"use client";
// Konva strip renderer. Client-only (loaded through TapeCanvas2D with ssr:false).
// Registers a StageRenderer for exports and publishes a full-resolution canvas for the 3D texture.
import { useEffect, useMemo, useRef, useState } from "react";
import type Konva from "konva";
import { Group, Image as KImage, Layer, Rect, Stage, Text } from "react-konva";
import { format, getDictionary } from "@/i18n";
import { STRIP_LENGTH_MM } from "../lib/constants";
import { logoInkColor } from "../lib/palette";
import { computePatternLayout, stripSize } from "../lib/pattern";
import { useDesignContext } from "./DesignProvider";
import { useDesignState } from "./hooks";
import { useTintedLogo } from "./use-tinted-logo";

let measureCtx: CanvasRenderingContext2D | null = null;
function measureTextWidth(text: string, fontFamily: string, sizePx: number): number {
  if (!text) return 0;
  measureCtx ??= document.createElement("canvas").getContext("2d");
  if (!measureCtx) return text.length * sizePx * 0.6;
  measureCtx.font = `bold ${sizePx}px "${fontFamily}"`;
  return measureCtx.measureText(text).width;
}

export default function KonvaTapeStage() {
  const t = getDictionary().designer;
  const { store } = useDesignContext();
  const [s] = useDesignState();
  const wrapRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const [displayWidth, setDisplayWidth] = useState(0);

  const strip = stripSize(s.preset.width_mm);
  const fontSize = Math.min(s.fontSizePx, strip.height * 0.9);
  const ink = logoInkColor(s);
  const logoCanvas = useTintedLogo(s.logo, ink);
  const text = s.text.trim();

  const layout = useMemo(
    () =>
      computePatternLayout({
        strip,
        textWidth: measureTextWidth(text, s.fontFamily, fontSize),
        logoAspect: s.logo && logoCanvas ? s.logo.width / s.logo.height : null,
        logoScale: s.logoScale,
        logoOffsetX: s.logoOffsetX,
        logoOffsetY: s.logoOffsetY,
        repeatGapPx: s.repeatGapPx,
      }),
    // strip is derived from preset width; list primitives to avoid object identity churn.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [strip.width, strip.height, text, s.fontFamily, fontSize, s.logo, logoCanvas, s.logoScale, s.logoOffsetX, s.logoOffsetY, s.repeatGapPx],
  );

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const update = () => setDisplayWidth(Math.floor(el.clientWidth));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const scale = displayWidth > 0 ? displayWidth / strip.width : 0;

  // Export hook: pixel ratio is relative to the logical (unscaled) strip size.
  useEffect(() => {
    if (!scale) return;
    store.registerRenderer({
      toCanvas: (pixelRatio) => {
        const stage = stageRef.current;
        if (!stage) throw new Error("designer_not_ready");
        return stage.toCanvas({ pixelRatio: pixelRatio / scale });
      },
    });
    return () => store.registerRenderer(null);
  }, [store, scale]);

  // Publish live texture after each redraw (one per animation frame).
  useEffect(() => {
    if (!scale) return;
    const id = requestAnimationFrame(() => {
      const stage = stageRef.current;
      if (stage) store.publishTexture(stage.toCanvas({ pixelRatio: 1 / scale }));
    });
    return () => cancelAnimationFrame(id);
  }, [store, scale, layout, s.backgroundColor, s.textColor, ink]);

  return (
    <figure className="flex flex-col gap-1">
      <div ref={wrapRef} className="w-full overflow-hidden rounded border border-neutral-300" role="img" aria-label={t.previewLabel}>
        {scale > 0 && (
          <Stage ref={stageRef} width={displayWidth} height={Math.round(strip.height * scale)} scaleX={scale} scaleY={scale} listening={false}>
            <Layer>
              <Rect x={0} y={0} width={strip.width} height={strip.height} fill={s.backgroundColor} />
              {layout.tiles.map((tile, i) => (
                <Group key={i}>
                  {tile.logo && logoCanvas && (
                    <KImage image={logoCanvas} x={tile.logo.x} y={tile.logo.y} width={tile.logo.width} height={tile.logo.height} />
                  )}
                  {tile.textX !== null && (
                    <Text
                      text={text}
                      x={tile.textX}
                      y={0}
                      height={strip.height}
                      verticalAlign="middle"
                      fontFamily={s.fontFamily}
                      fontStyle="bold"
                      fontSize={fontSize}
                      fill={s.textColor}
                      wrap="none"
                    />
                  )}
                </Group>
              ))}
            </Layer>
          </Stage>
        )}
      </div>
      <figcaption className="text-xs text-neutral-500">
        {format(t.stripCaption, { length: STRIP_LENGTH_MM, width: s.preset.width_mm })}
      </figcaption>
    </figure>
  );
}
