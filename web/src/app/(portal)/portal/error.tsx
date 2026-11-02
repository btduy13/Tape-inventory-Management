"use client";
import { RouteError } from "@/features/portal-ui/components/RouteError";

export default function PortalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <RouteError reset={reset} />;
}
