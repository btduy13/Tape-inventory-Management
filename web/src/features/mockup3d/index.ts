// Public API of features/mockup3d. Pure client feature: no network calls.
export { TapeMockup3D, type TapeMockup3DProps } from "./components/TapeMockup3D";
export { MOCKUP_VIEWS, type MockupView } from "./lib/views";
export { rollGeometry, rollOuterRadiusMm, textureRepeat, type RollPreset } from "./lib/geometry";
export { hasWebGL } from "./lib/webgl";
