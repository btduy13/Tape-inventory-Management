// Public API of features/quotes.
// Components
export { QuotePanel } from "./components/quote-panel";
export { QuoteEditor } from "./components/quote-editor";
export { QuoteLinesView } from "./components/quote-lines-view";
export { PublicQuotePage } from "./components/public-quote-page";

// Server actions (admin/manager unless noted)
export {
  createDraftQuoteAction,
  saveQuoteDraftAction,
  createQuoteVersionAction,
  getQuotePdfUrlAction, // any internal user who can read the lead
} from "./server/actions-edit";
export { sendQuoteAction } from "./server/actions-send";

// Route handler logic for POST /api/q/[token]/respond
export { handleRespondRequest } from "./server/respond-route";

// Queries + types
export { listQuotesForLead, getQuoteWithLines } from "./server/queries";
export type { QuoteWithLines, PublicQuote, ActionResult } from "./lib/types";
export { estimateTotals } from "./lib/totals";
