// Public API of features/mockup3d. Pure client feature: no network calls.
export { MOCKUP_DISCLAIMER, TapeMockup3D, type MockupAspect, type TapeMockup3DProps } from "./components/TapeMockup3D";
export type { ColorPickerBridge, PickedColorFacts } from "./components/Eyedropper";
export { MOCKUP_VIEWS, type MockupView } from "./lib/views";
export { rollGeometry, rollOuterRadiusMm, textureRepeat, type RollPreset } from "./lib/geometry";
export { hasWebGL } from "./lib/webgl";
export { Watermark } from "./components/Watermark";
