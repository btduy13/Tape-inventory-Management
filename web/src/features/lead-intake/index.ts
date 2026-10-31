// Public API of features/lead-intake (client-safe exports only).
// Server-only exports live in ./server/index.ts; landing sections in ./landing/index.ts.
export { LeadForm, type LeadFormProps } from "./components/LeadForm";
export { DesignLeadForm } from "./components/DesignLeadForm";
export type { LeadDesign, GetLeadDesign } from "./lib/design-contract";
export type { LeadNotifier, NewLeadEmailData } from "./lib/email-contract";
export type { LeadSubmitResponse, LeadErrorCode } from "./lib/api-contract";
export { leadFieldsSchema, type LeadFields } from "./lib/lead-schema";
