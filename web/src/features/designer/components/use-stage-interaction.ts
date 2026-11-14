"use client";
// Selection, drag, resize (Transformer) and keyboard handling for the Konva strip.
// Every move goes through the reducer (clamped), then the dragged node snaps to the clamped spot.
// Logo nodes are positioned by their centre (they rotate around it); text nodes by the top-left.
import { useCallback, useState, type KeyboardEvent } from "react";
import type Konva from "konva";
import type { KonvaEventObject } from "konva/lib/Node";
import {
  deleteAction, fontSizeFromScale, logoScaleFromHeight, moveAction, nudgeAction, offsetFromPosition,
  type ElementKind,
} from "../lib/interaction";
import type { Box, PatternLayout } from "../lib/pattern";
import { maxFontSize } from "../lib/state";
import type { DesignStore } from "../lib/store";
import { layoutForState, type LogoDims } from "./stage-layout";

export type Selection = { kind: ElementKind; tile: number } | null;

export function useStageInteraction(store: DesignStore, layout: PatternLayout, logo: LogoDims) {
  const [selected, setSelected] = useState<Selection>(null);

  const current = useCallback(() => {
    const s = store.getState();
    return { s, layout: layoutForState(s, logo) };
  }, [store, logo]);

  /** Move `kind` of tile `tile` to the node position, then snap the node to the clamped box. */
  const commitPosition = useCallback(
    (node: Konva.Node, kind: ElementKind, tile: number) => {
      const { layout: cur } = current();
      const before = cur.tiles[tile]?.[kind];
      if (!before) return;
      const tl = topLeft(kind, before, node.x(), node.y());
      const off = offsetFromPosition(cur, kind, tile, tl.x, tl.y);
      if (!off) return;
      store.dispatch(moveAction(kind, off.offsetX, off.offsetY));
      const box = current().layout.tiles[tile]?.[kind];
      if (box) node.position(nodePosition(kind, box));
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
        const height = (cur.logoSize?.height ?? 0) * k;
        store.dispatch({ type: "setLogoTransform", scale: logoScaleFromHeight(height, cur), rotation: node.rotation() });
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

/** Top-left of the element box from its node position (logo nodes sit at the box centre). */
function topLeft(kind: ElementKind, box: Box, x: number, y: number): { x: number; y: number } {
  return kind === "logo" ? { x: x - box.width / 2, y: y - box.height / 2 } : { x, y };
}

/** Node position for an element box. */
export function nodePosition(kind: ElementKind, box: Box): { x: number; y: number } {
  return kind === "logo" ? { x: box.x + box.width / 2, y: box.y + box.height / 2 } : { x: box.x, y: box.y };
}
