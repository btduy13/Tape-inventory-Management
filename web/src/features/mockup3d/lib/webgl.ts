// WebGL capability check (cheap, no rendering). Injectable for tests.

type CanvasFactory = () => { getContext(id: string): unknown } | null;

const defaultFactory: CanvasFactory = () => {
  if (typeof window === "undefined" || typeof document === "undefined") return null;
  if (!("WebGLRenderingContext" in window)) return null;
  return document.createElement("canvas");
};

export function hasWebGL(createCanvas: CanvasFactory = defaultFactory): boolean {
  try {
    const canvas = createCanvas();
    if (!canvas) return false;
    return Boolean(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
  } catch {
    return false;
  }
}
