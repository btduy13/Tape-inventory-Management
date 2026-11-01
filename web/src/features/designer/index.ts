// Public API of features/designer. Other features import ONLY from here.
//
// Page usage:
//   <DesignProvider spec={await getTapeSpec()}>
//     <DesignerPanel /> <DesignMockupBridge /> <LeadForm />   // LeadForm uses useDesignExport()
//   </DesignProvider>
//
// Server-only: import { getTapeSpec } from "@/features/designer/server" (keeps 'server-only'
// out of client bundles).

// Components (client)
export { DesignProvider } from "./components/DesignProvider";
export { DesignerPanel } from "./components/DesignerPanel";
export { DesignMockupBridge } from "./components/DesignMockupBridge";
export { TapeCanvas2D } from "./components/TapeCanvas2D";

// Hooks (client)
export { useDesignState, useDesignTexture, useDesignExport, type DesignExportApi } from "./components/hooks";

// Pure helpers / schemas (server + client)
export { toDesignJson, buildDesignSubmission, designJsonSchema, type DesignSubmission } from "./lib/design-json";
export { sanitizeSvg } from "./lib/svg-sanitize";
export { checkLogoBytes, sniffImageKind, logoMime } from "./lib/logo-validate";
export { paletteColors, normalizeHex } from "./lib/palette";
export { DEFAULT_PRESETS, toPresetOption, type PresetOption } from "./lib/presets";
export {
  DEFAULT_TAPE_SPEC, checkTapeSize, formatTapeSize, toTapeSpec, LENGTH_M_MAX, WIDTH_MM_MAX,
  type TapeSizeError, type TapeSpec,
} from "./lib/tape-spec";
export { MAX_COLORS, MAX_LOGO_BYTES, MAX_TEXT_LENGTH } from "./lib/constants";
export type { DesignState, DesignAction, LogoAsset, LogoKind } from "./lib/state";
export type { DesignStore } from "./lib/store";
