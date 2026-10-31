"use client";
// Public hooks over the design store (consumed by lead-intake and mockup bridge).
import { useCallback, useMemo, useSyncExternalStore } from "react";
import { buildDesignSubmission, toDesignJson, type DesignSubmission } from "../lib/design-json";
import { exportDesignJsonBlob, exportDesignPng } from "../lib/export";
import type { DesignAction, DesignState } from "../lib/state";
import type { TextureSnapshot } from "../lib/store";
import type { DesignJson } from "@/lib/types";
import { useDesignContext } from "./DesignProvider";

/** Current design state + dispatch. */
export function useDesignState(): [DesignState, (a: DesignAction) => void] {
  const { store } = useDesignContext();
  const state = useSyncExternalStore(store.subscribe, store.getState, store.getState);
  return [state, store.dispatch];
}

const EMPTY_TEXTURE: TextureSnapshot = { canvas: null, version: 0 };

/** Live strip canvas for the 3D mockup texture. */
export function useDesignTexture(): TextureSnapshot {
  const { store } = useDesignContext();
  return useSyncExternalStore(store.subscribeTexture, store.getTexture, () => EMPTY_TEXTURE);
}

export type DesignExportApi = {
  /** design_json for the `designs` row (logo.path filled by the server). */
  getDesignJson(): DesignJson;
  /** preset dims + colours + print_text + design_json. */
  getSubmission(): DesignSubmission;
  /** Rendered strip PNG (preview upload). Rejects if the canvas is not mounted. */
  getPngBlob(pixelRatio?: number): Promise<Blob>;
  getDesignJsonBlob(): Blob;
  /** Logo file to upload (SVG already sanitized), or null. */
  getLogoFile(): File | null;
};

/** Stable export API for lead-intake (reads the latest state at call time). */
export function useDesignExport(): DesignExportApi {
  const { store } = useDesignContext();
  const getLogoFile = useCallback(() => store.getState().logo?.file ?? null, [store]);
  return useMemo(
    () => ({
      getDesignJson: () => toDesignJson(store.getState()),
      getSubmission: () => buildDesignSubmission(store.getState()),
      getPngBlob: (pixelRatio?: number) => exportDesignPng(store, pixelRatio),
      getDesignJsonBlob: () => exportDesignJsonBlob(store),
      getLogoFile,
    }),
    [store, getLogoFile],
  );
}
