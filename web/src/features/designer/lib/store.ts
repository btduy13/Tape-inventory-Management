// Tiny external store (useSyncExternalStore-compatible). No React import: unit-testable.
import { createInitialState, designReducer, type DesignAction, type DesignState } from "./state";
import type { PresetOption } from "./presets";

/** Registered by the Konva stage so non-canvas code can export renders. */
export type StageRenderer = {
  /** Render the strip at `pixelRatio` x logical size (logical = mm * PX_PER_MM). */
  toCanvas(pixelRatio: number): HTMLCanvasElement;
};

export type TextureSnapshot = { canvas: HTMLCanvasElement | null; version: number };

export type DesignStore = {
  getState(): DesignState;
  dispatch(action: DesignAction): void;
  subscribe(listener: () => void): () => void;
  registerRenderer(renderer: StageRenderer | null): void;
  getRenderer(): StageRenderer | null;
  /** Latest strip canvas for live 3D texture. */
  publishTexture(canvas: HTMLCanvasElement): void;
  getTexture(): TextureSnapshot;
  subscribeTexture(listener: () => void): () => void;
  destroy(): void;
};

type RevokeFn = (url: string) => void;

const defaultRevoke: RevokeFn = (url) => {
  if (typeof URL !== "undefined" && typeof URL.revokeObjectURL === "function") URL.revokeObjectURL(url);
};

export function createDesignStore(preset?: PresetOption, revoke: RevokeFn = defaultRevoke): DesignStore {
  let state = createInitialState(preset);
  let renderer: StageRenderer | null = null;
  let texture: TextureSnapshot = { canvas: null, version: 0 };
  const listeners = new Set<() => void>();
  const textureListeners = new Set<() => void>();

  const emit = (set: Set<() => void>) => {
    for (const l of [...set]) l();
  };

  return {
    getState: () => state,
    dispatch(action) {
      const prev = state;
      const next = designReducer(prev, action);
      if (next === prev) return;
      // Revoke object URLs the new state no longer holds (toggling the clean-up keeps both).
      const held = new Set([next.logo?.url, next.logo?.alt?.url]);
      for (const u of [prev.logo?.url, prev.logo?.alt?.url]) if (u && !held.has(u)) revoke(u);
      state = next;
      emit(listeners);
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    registerRenderer(r) {
      renderer = r;
    },
    getRenderer: () => renderer,
    publishTexture(canvas) {
      texture = { canvas, version: texture.version + 1 };
      emit(textureListeners);
    },
    getTexture: () => texture,
    subscribeTexture(listener) {
      textureListeners.add(listener);
      return () => textureListeners.delete(listener);
    },
    destroy() {
      if (state.logo) revoke(state.logo.url);
      if (state.logo?.alt) revoke(state.logo.alt.url);
      listeners.clear();
      textureListeners.clear();
      renderer = null;
    },
  };
}
