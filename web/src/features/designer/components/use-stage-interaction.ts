"use client";
// Selection, drag, resize (Transformer) and keyboard handling for the Konva strip.
// Every move goes through the reducer (clamped), then the dragged node snaps to the clamped spot.
import { useCallback, useState, type KeyboardEvent } from "react";
import type Konva from "konva";
import type { KonvaEventObject } from "konva/lib/Node";
import {
  deleteAction, fontSizeFromScale, logoScaleFromHeight, moveAction, nudgeAction, offsetFromPosition,
  type ElementKind,
} from "../lib/interaction";
import { stripSize, type PatternLayout } from "../lib/pattern";
import { maxFontSize } from "../lib/state";
import type { DesignStore } from "../lib/store";
import { layoutForState } from "./stage-layout";

export type Selection = { kind: ElementKind; tile: number } | null;

export function useStageInteraction(store: DesignStore, layout: PatternLayout, logoReady: boolean) {
  const [selected, setSelected] = useState<Selection>(null);

  const current = useCallback(() => {
    const s = store.getState();
    return { s, strip: stripSize(s.preset.width_mm), layout: layoutForState(s, logoReady) };
  }, [store, logoReady]);

  /** Move `kind` of tile `tile` to the node position, then snap the node to the clamped box. */
  const commitPosition = useCallback(
    (node: Konva.Node, kind: ElementKind, tile: number) => {
      const { layout: cur } = current();
      const off = offsetFromPosition(cur, kind, tile, node.x(), node.y());
      if (!off) return;
      store.dispatch(moveAction(kind, off.offsetX, off.offsetY));
      const box = current().layout.tiles[tile]?.[kind];
      if (box) node.position({ x: box.x, y: box.y });
    },
    [current, store],
  );

  const onDragMove = useCallback(
    (kind: ElementKind, tile: number) => (e: KonvaEventObject<DragEvent>) => commitPosition(e.target, kind, tile),
    [commitPosition],
  );

  const onTransformEnd = useCallback(
    (kind: ElementKind, tile: number) => (e: KonvaEventObject<Event>) => {
      const node = e.target;
      const k = node.scaleY();
      node.scale({ x: 1, y: 1 });
      const { s, layout: cur } = current();
      if (kind === "logo") {
        const height = (cur.tiles[tile]?.logo?.height ?? 0) * k;
        store.dispatch({ type: "setLogoTransform", scale: logoScaleFromHeight(height, cur) });
      } else {
        const px = Math.min(fontSizeFromScale(cur.fontSize, k, cur.fontScale), maxFontSize(s.preset.width_mm));
        store.dispatch({ type: "setFontSize", px });
      }
      commitPosition(node, kind, tile);
    },
    [commitPosition, current, store],
  );

  const select = useCallback((kind: ElementKind, tile: number) => () => setSelected({ kind, tile }), []);
  const clear = useCallback(() => setSelected(null), []);

  const onKeyDown = useCallback(
    (e: KeyboardEvent<HTMLElement>) => {
      const fallback: ElementKind | null = layout.effective.text ? "text" : layout.effective.logo ? "logo" : null;
      const kind = selected?.kind ?? fallback;
      if (!kind) return;
      if (e.key === "Escape") return setSelected(null);
      if ((e.key === "Delete" || e.key === "Backspace") && selected) {
        e.preventDefault();
        store.dispatch(deleteAction(selected.kind));
        return setSelected(null);
      }
      const action = nudgeAction(layout, kind, e.key, e.shiftKey);
      if (!action) return;
      e.preventDefault();
      store.dispatch(action);
      if (!selected) setSelected({ kind, tile: 0 });
    },
    [layout, selected, store],
  );

  // A removed element cannot stay selected.
  const live = selected && layout.tiles.length > 0 && layout.effective[selected.kind]
    ? { ...selected, tile: Math.min(selected.tile, layout.tiles.length - 1) }
    : null;

  return { selected: live, select, clear, onDragMove, onTransformEnd, onKeyDown };
}
