"use client";
// Public hooks over the design store (consumed by lead-intake and mockup bridge).
import { useCallback, useMemo, useSyncExternalStore } from "react";
import { buildDesignSubmission, toDesignJson, type DesignSubmission } from "../lib/design-json";
import { exportDesignJsonBlob, exportDesignPng } from "../lib/export";
import type { DesignAction, DesignState } from "../lib/state";
import { checkTapeSize, type TapeSizeError, type TapeSpec } from "../lib/tape-spec";
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
  /** Tape size check against the page's spec (the server re-checks against the DB). */
  getSizeError(): TapeSizeError | null;
  /** Active widths + length range shown in the designer. */
  spec: TapeSpec;
};

/** Stable export API for lead-intake (reads the latest state at call time). */
export function useDesignExport(): DesignExportApi {
  const { store, spec } = useDesignContext();
  const getLogoFile = useCallback(() => store.getState().logo?.file ?? null, [store]);
  return useMemo(
    () => ({
      getDesignJson: () => toDesignJson(store.getState()),
      getSubmission: () => buildDesignSubmission(store.getState()),
      getPngBlob: (pixelRatio?: number) => exportDesignPng(store, pixelRatio),
      getDesignJsonBlob: () => exportDesignJsonBlob(store),
      getLogoFile,
      getSizeError: () => {
        const p = store.getState().preset;
        return checkTapeSize(spec, p.width_mm, p.length_m);
      },
      spec,
    }),
    [store, spec, getLogoFile],
  );
}
