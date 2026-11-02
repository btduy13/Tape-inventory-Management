// Custom 404: Tailwind classes only. Next's built-in not-found page uses inline `style`
// attributes, which the nonce-based style-src CSP blocks (console CSP error).
import Link from "next/link";
import { vi } from "@/i18n/vi";
import { ROUTES } from "@/lib/routes";

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center gap-4 px-4 py-24 text-center">
      <p className="text-5xl font-bold text-vt-blue">404</p>
      <h1 className="text-xl font-semibold text-vt-ink">{vi.common.notFoundTitle}</h1>
      <p className="text-neutral-600">{vi.common.notFoundBody}</p>
      <Link href={ROUTES.home} className="rounded-md bg-vt-blue px-4 py-2 text-sm font-semibold text-white hover:bg-vt-navy">
        {vi.nav.home}
      </Link>
    </main>
  );
}
