"use client";
// Cloudflare Turnstile, rendered only after mount: the library sets a React `style` prop,
// which as an SSR style="" attribute would violate the nonce-only style-src CSP.
import { forwardRef, useEffect, useState } from "react";
import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";

import { TURNSTILE_ACTION } from "../lib/api-contract";

type Props = {
  siteKey: string;
  nonce?: string;
  onToken: (token: string | null) => void;
};

export const TurnstileWidget = forwardRef<TurnstileInstance | undefined, Props>(
  function TurnstileWidget({ siteKey, nonce, onToken }, ref) {
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);
    if (!mounted) return <div className="h-[65px]" aria-hidden />;
    return (
      <Turnstile
        ref={ref}
        siteKey={siteKey}
        options={{ action: TURNSTILE_ACTION, language: "vi", theme: "light", size: "flexible" }}
        scriptOptions={nonce ? { nonce } : undefined}
        onSuccess={(token) => onToken(token)}
        onExpire={() => onToken(null)}
        onError={() => onToken(null)}
      />
    );
  },
);
