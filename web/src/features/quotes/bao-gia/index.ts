// Public API of the "Báo giá" pages (/admin/bao-gia): multi-size quotes like the desktop app
// (quotations.js). The older lead-quote feature lives in the parent features/quotes folder.
export { QuotesView } from "./components/QuotesView";
export { QuoteEditor } from "./components/QuoteEditor";
export { QuoteSheet } from "./components/QuoteSheet";
export { PrintButton } from "./components/PrintButton";
export { draftsFromQuote } from "./lib/stored";
export { QUOTE_TYPES, type QuoteType, type SizeDraft } from "./lib/bundle";
export { TYPE_LABEL, newQuoteHref, parseQuoteType, quoteEditHref } from "./lib/paths";
export { getQuote } from "./server/queries";
