"use client";
// Konva strip renderer. Client-only (loaded through TapeCanvas2D with ssr:false).
// Logo and text are draggable / resizable (Transformer) and keyboard-movable; the pattern repeats
// every change (pattern.ts: turned tiles are rotated groups, wrap-around ghost copies are inert). Registers a StageRenderer for exports and publishes the 3D texture from the
// content layer only, so selection handles never end up in the print.
import { useEffect, useMemo, useRef, useState } from "react";
import type Konva from "konva";
import { Group, Image as KImage, Layer, Line, Rect, Stage, Text, Transformer } from "react-konva";
import { format, getDictionary } from "@/i18n";
import { STRIP_LENGTH_MM, TEXT_LINE_HEIGHT } from "../lib/constants";
import { borderShapes } from "../lib/border";
import { stripSize, type TileTransform } from "../lib/pattern";
import { textLines } from "../lib/state";
import { Watermark } from "@/features/mockup3d";
import { useDesignContext } from "./DesignProvider";
import { useDesignState } from "./hooks";
import { layoutForState } from "./stage-layout";
import { useStageInteraction } from "./use-stage-interaction";
import { tintCanvas, useLogoCanvas } from "./use-logo-canvas";

export default function KonvaTapeStage() {
  const t = getDictionary().designer;
  const { store } = useDesignContext();
  const [s] = useDesignState();
  const wrapRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const contentRef = useRef<Konva.Layer>(null);
  const trRef = useRef<Konva.Transformer>(null);
  const [displayWidth, setDisplayWidth] = useState(0);

  const strip = stripSize(s.preset.width_mm);
  const logoCanvas = useLogoCanvas(s.logo);
  const text = textLines(s.text).join("\n");
  const layout = useMemo(() => layoutForState(s, logoCanvas !== null), [s, logoCanvas]);
  const ui = useStageInteraction(store, layout, logoCanvas !== null);
  const hasFill = layout.tiles.some((tile) => tile.fill);
  const knockout = useMemo(
    () => (hasFill && logoCanvas ? tintCanvas(logoCanvas, s.backgroundColor) : null),
    [hasFill, logoCanvas, s.backgroundColor],
  );
  const border = useMemo(
    () => borderShapes({ width: strip.width, height: strip.height }, s.border.style, layout.borderPx),
    [strip.width, strip.height, s.border.style, layout.borderPx],
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
  const stageW = Math.round(strip.width * scale);
  const stageH = Math.round(strip.height * scale);

  // Export hook: pixel ratio is relative to the logical (unscaled) strip size.
  useEffect(() => {
    if (!scale) return;
    store.registerRenderer({
      toCanvas: (pixelRatio) => {
        const layer = contentRef.current;
        if (!layer) throw new Error("designer_not_ready");
        return layer.toCanvas({ x: 0, y: 0, width: stageW, height: stageH, pixelRatio: pixelRatio / scale });
      },
    });
    return () => store.registerRenderer(null);
  }, [store, scale, stageW, stageH]);

  // Publish live texture after each redraw (one per animation frame).
  useEffect(() => {
    if (!scale) return;
    const id = requestAnimationFrame(() => {
      const layer = contentRef.current;
      if (layer) store.publishTexture(layer.toCanvas({ x: 0, y: 0, width: stageW, height: stageH, pixelRatio: 1 / scale }));
    });
    return () => cancelAnimationFrame(id);
  }, [store, scale, stageW, stageH, layout, border, s.backgroundColor, s.textColor, logoCanvas, knockout]);

  // Attach the Transformer to the selected node.
  const sel = ui.selected;
  useEffect(() => {
    const tr = trRef.current;
    if (!tr) return;
    const node = sel ? stageRef.current?.findOne(`#${sel.kind}-${sel.tile}`) : undefined;
    tr.nodes(node ? [node] : []);
    tr.getLayer()?.batchDraw();
  }, [sel, layout, scale]);

  const band = layout.band;
  const maxBox = (band.bottom - band.top) * scale;
  const onStageDown = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    if (e.target === e.target.getStage() || e.target.name() === "bg") ui.clear();
  };
  const empty = layout.tiles.length === 0;
  const live = text ? format(t.previewWithText, { text }) : s.logo ? t.previewLogoOnly : t.previewEmpty;

  return (
    <figure className="flex min-w-0 flex-col gap-2">
      <div
        ref={wrapRef}
        tabIndex={0}
        role="application"
        aria-label={`${t.previewLabel}. ${live}. ${t.canvasHelp}`}
        onKeyDown={ui.onKeyDown}
        className="relative w-full min-w-0 overflow-hidden rounded-md shadow-[0_1px_2px_rgba(15,23,42,0.12),0_4px_12px_-4px_rgba(15,23,42,0.18)] ring-1 ring-slate-900/10 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-slate-900"
      >
        {scale > 0 && (
          <Stage ref={stageRef} width={stageW} height={stageH} scaleX={scale} scaleY={scale} onMouseDown={onStageDown} onTouchStart={onStageDown}>
            <Layer ref={contentRef}>
              <Rect name="bg" x={0} y={0} width={strip.width} height={strip.height} fill={s.backgroundColor} />
              {border.rects.map((r, i) => (
                <Rect key={`br-${i}`} {...r} fill={s.textColor} listening={false} />
              ))}
              {border.bands.map((b, bi) => (
                border.stripes.length > 0 && (
                  <Group key={`bs-${bi}`} clipX={0} clipY={b.top} clipWidth={strip.width} clipHeight={b.bottom - b.top} listening={false}>
                    {border.stripes.filter((p) => p[1] === b.top).map((p, i) => (
                      <Line key={i} points={p} closed fill={s.textColor} />
                    ))}
                  </Group>
                )
              ))}
              <Group clipX={0} clipY={layout.clip.top} clipWidth={strip.width} clipHeight={layout.clip.bottom - layout.clip.top}>
              {layout.tiles.map((tile, i) => tile.fill && (
                <Rect key={`fill-${i}`} name="bg" {...tile.cell} fill={s.textColor} />
              ))}
              {layout.tiles.map((tile, i) => (
                <Group key={i} listening={!tile.ghost} {...groupTransform(tile.transform)}>
                  {tile.logo && logoCanvas && layout.logoSize && (
                    <KImage
                      id={`logo-${i}`}
                      image={tile.fill && knockout ? knockout : logoCanvas}
                      x={tile.logo.x + tile.logo.width / 2}
                      y={tile.logo.y + tile.logo.height / 2}
                      width={layout.logoSize.width}
                      height={layout.logoSize.height}
                      offsetX={layout.logoSize.width / 2}
                      offsetY={layout.logoSize.height / 2}
                      rotation={layout.logoRotation}
                      draggable
                      onMouseDown={ui.select("logo", i)}
                      onTouchStart={ui.select("logo", i)}
                      onDragMove={ui.onDragMove("logo", i)}
                      onTransformEnd={ui.onTransformEnd("logo", i)}
                    />
                  )}
                  {tile.text && (
                    <Text
                      id={`text-${i}`}
                      text={text}
                      x={tile.text.x}
                      y={tile.text.y}
                      fontFamily={s.fontFamily}
                      fontStyle="bold"
                      fontSize={layout.fontSize}
                      lineHeight={layout.textHeightRatio === 1 ? 1 : TEXT_LINE_HEIGHT}
                      align="center"
                      width={tile.text.width}
                      fill={tile.fill ? s.backgroundColor : s.textColor}
                      wrap="none"
                      draggable
                      onMouseDown={ui.select("text", i)}
                      onTouchStart={ui.select("text", i)}
                      onDragMove={ui.onDragMove("text", i)}
                      onTransformEnd={ui.onTransformEnd("text", i)}
                    />
                  )}
                </Group>
              ))}
              </Group>
            </Layer>
            <Layer>
              <Transformer
                ref={trRef}
                rotateEnabled={sel?.kind === "logo"}
                rotationSnaps={[0, 45, 90, 135, 180, 225, 270, 315]}
                rotationSnapTolerance={4}
                keepRatio
                enabledAnchors={["top-left", "top-right", "bottom-left", "bottom-right"]}
                anchorSize={14}
                anchorCornerRadius={7}
                borderStroke="#2563eb"
                anchorStroke="#2563eb"
                anchorFill="#ffffff"
                boundBoxFunc={(oldBox, box) => (box.height < 8 || box.height > maxBox + 1 ? oldBox : box)}
              />
            </Layer>
          </Stage>
        )}
        {/* Screen-only brand mark (HTML overlay): never in the texture or the staff preview PNG. */}
        <Watermark />
        {empty && scale > 0 && (
          <p className="pointer-events-none absolute inset-0 flex items-center justify-center px-2 text-center text-xs font-medium text-slate-800 sm:text-sm">
            {t.emptyCanvas}
          </p>
        )}
      </div>
      {layout.fit < 0.999 && (
        <p role="status" className="text-xs font-medium text-amber-900">
          {format(t.autoFit, { px: Math.round(layout.fontSize) })}
        </p>
      )}
      <figcaption className="text-xs leading-5 text-slate-600">
        {format(t.stripCaption, { length: STRIP_LENGTH_MM, width: s.preset.width_mm })}
        <span className="hidden pointer-fine:inline"> · {t.canvasHelp}</span>
      </figcaption>
    </figure>
  );
}

/** Konva group props for a turned tile: children keep unrotated coordinates (drag maths unchanged). */
function groupTransform(tr: TileTransform | null) {
  if (!tr) return {};
  return {
    x: tr.pivotX + tr.dx,
    y: tr.pivotY + tr.dy,
    offsetX: tr.pivotX,
    offsetY: tr.pivotY,
    rotation: tr.rotation,
    scaleX: tr.scale,
    scaleY: tr.scale,
  };
}
