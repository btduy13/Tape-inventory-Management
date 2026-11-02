"use client";
// Route error boundary body for the portal (error.tsx must be a client component).
// Shows no error details: the message may carry server internals.
import { getDictionary } from "@/i18n";
import { ErrorState } from "./States";
import { buttonClass } from "./styles";

const p = getDictionary().portalUi;

export function RouteError({ reset }: { reset: () => void }) {
  return (
    <ErrorState
      body={p.errorRouteBody}
      action={<button type="button" onClick={reset} className={buttonClass("secondary", "sm")}>{p.retry}</button>}
    />
  );
}
