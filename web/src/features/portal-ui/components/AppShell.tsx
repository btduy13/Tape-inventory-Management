// Portal frame for every role: navy sidebar (lg+) or top bar + drawer (phones / tablets).
// Display only: the layout calls requireRole() and every page re-checks its own role / tab.
import Link from "next/link";
import { getDictionary } from "@/i18n";
import type { Profile } from "@/lib/types";
import { LogoutButton } from "@/features/auth";
import { homeFor } from "../lib/nav";
import { MobileNav } from "./MobileNav";
import { NavLinks } from "./NavLinks";

const t = getDictionary();
const p = t.portalUi;

/** White "label" tile carrying the full-colour logo (its blue script needs a light ground). */
function BrandTile({ href }: { href: string }) {
  return (
    <Link href={href} className="flex items-center gap-3 rounded-xl bg-white p-2.5 text-vt-ink">
      {/* eslint-disable-next-line @next/next/no-img-element -- next/image writes a style attribute (blocked by CSP) */}
      <img src="/brand/vinh-thinh-logo.png" alt="" width={478} height={632} className="h-11 w-auto" />
      <span className="flex flex-col leading-tight">
        <span className="font-bold">{p.brand}</span>
        <span className="text-xs text-pt-muted">{p.brandSub}</span>
      </span>
    </Link>
  );
}

function UserBlock({ profile }: { profile: Profile }) {
  return (
    <div className="flex flex-col gap-2 border-t border-white/15 pt-4">
      <p className="sr-only">{p.signedInAs}</p>
      <p className="truncate text-sm font-semibold text-white">{profile.full_name || profile.email}</p>
      <p className="flex items-center gap-2 text-xs text-white/75">
        <span className="rounded-full bg-vt-yellow px-2 py-0.5 font-bold text-vt-ink">{t.roles[profile.role]}</span>
        <span className="truncate">{profile.email}</span>
      </p>
      <div className="[&_button]:min-h-11 [&_button]:w-full [&_button]:justify-start [&_button]:rounded-lg [&_button]:text-white/85 [&_button]:hover:bg-white/10 [&_button]:hover:text-white">
        <LogoutButton />
      </div>
    </div>
  );
}

export function AppShell({ profile, children }: { profile: Profile; children: React.ReactNode }) {
  const home = homeFor(profile.role);
  // Only what the menu needs crosses to the client components.
  const nav = { role: profile.role, is_active: profile.is_active, nav_tabs: profile.nav_tabs, permissions: profile.permissions };
  return (
    <div className="pt-root flex min-h-dvh flex-1 flex-col">
      <a href="#pt-main" className="sr-only z-50 rounded-lg bg-vt-yellow px-4 py-3 font-semibold text-vt-ink focus:not-sr-only focus:fixed focus:left-3 focus:top-3">
        {p.skipToContent}
      </a>

      {/* lg+: fixed sidebar */}
      <aside className="pt-on-dark fixed inset-y-0 left-0 hidden w-64 flex-col gap-6 bg-vt-navy-deep p-4 lg:flex">
        <BrandTile href={home} />
        <nav aria-label={p.navMain} className="flex-1 overflow-y-auto">
          <NavLinks profile={nav} />
        </nav>
        <UserBlock profile={profile} />
      </aside>

      {/* < lg: top bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-pt-line bg-pt-surface px-4 py-1.5 lg:hidden">
        <Link href={home} className="flex min-h-11 items-center gap-2 font-bold text-vt-ink">
          {/* eslint-disable-next-line @next/next/no-img-element -- see BrandTile */}
          <img src="/brand/vinh-thinh-logo.png" alt="" width={478} height={632} className="h-9 w-auto" />
          {p.brand}
        </Link>
        <MobileNav profile={nav} userBlock={<UserBlock profile={profile} />} />
      </header>

      <main id="pt-main" tabIndex={-1} className="flex-1 lg:pl-64">
        <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</div>
      </main>
    </div>
  );
}
