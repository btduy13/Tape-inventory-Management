// Server-only public API of lead-intake (route handlers, Server Components).
import "server-only";
export { handleLeadSubmit, type LeadSubmitDeps } from "./handle-lead-submit";
export { createLeadSubmitDeps } from "./deps";
export { listActivePresets } from "./presets";
