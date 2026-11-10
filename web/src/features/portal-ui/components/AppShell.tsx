// Portal frame for every role: one top bar. lg+: tabs in the bar, settings and account as dropdowns;
// below lg: logo + drawer. Content uses the full width.
// Display only: the layout calls requireRole() and every page re-checks its own role / tab.
import Link from "next/link";
import { getDictionary } from "@/i18n";
import type { Profile } from "@/lib/types";
import { LogoutButton } from "@/features/auth";
import { homeFor } from "../lib/nav";
import { Dropdown } from "./Dropdown";
import { Icon } from "./Icon";
import { MobileNav } from "./MobileNav";
import { NavLinks } from "./NavLinks";

const t = getDictionary();
const p = t.portalUi;

const initialOf = (profile: Profile) => (profile.full_name || profile.email || "?").trim().charAt(0);

function Avatar({ profile }: { profile: Profile }) {
  return (
    <span aria-hidden className="flex size-9 shrink-0 items-center justify-center rounded-full bg-vt-blue text-sm font-bold uppercase text-white">
      {initialOf(profile)}
    </span>
  );
}

function UserBlock({ profile, bare = false }: { profile: Profile; bare?: boolean }) {
  return (
    <div className={`flex flex-col gap-2 ${bare ? "" : "border-t border-pt-line pt-3"}`}>
      <p className="sr-only">{p.signedInAs}</p>
      <div className="flex items-center gap-3 px-1">
        <Avatar profile={profile} />
        <div className="flex min-w-0 flex-col leading-tight">
          <span className="truncate text-sm font-semibold text-pt-text">{profile.full_name || profile.email}</span>
          <span className="truncate text-xs text-pt-muted">{t.roles[profile.role]} · {profile.email}</span>
        </div>
      </div>
      <div className="[&_button]:min-h-11 [&_button]:w-full [&_button]:rounded-lg [&_button]:text-left [&_button]:font-medium [&_button]:text-pt-muted [&_button]:hover:bg-pt-grey-tint [&_button]:hover:text-pt-text lg:[&_button]:min-h-10">
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

      <header className="sticky top-0 z-30 border-b border-pt-line bg-pt-surface">
        <div className="mx-auto flex h-14 w-full max-w-[1600px] items-center gap-3 px-4 sm:px-6 xl:gap-5">
          <Link href={home} className="flex min-h-11 shrink-0 items-center gap-2 font-bold text-vt-ink">
            {/* eslint-disable-next-line @next/next/no-img-element -- next/image writes a style attribute (blocked by CSP) */}
            <img src="/brand/vinh-thinh-logo.png" alt="" width={478} height={632} className="h-9 w-auto" />
            {p.brand}
          </Link>
          <nav aria-label={p.navMain} className="hidden min-w-0 flex-1 lg:block">
            <NavLinks profile={nav} variant="bar" />
          </nav>
          <div className="ml-auto hidden lg:block">
            <Dropdown
              align="end"
              summaryClass="min-h-11 gap-2 rounded-full pr-1 text-sm font-medium text-pt-text hover:bg-pt-grey-tint"
              summary={
                <>
                  <Avatar profile={profile} />
                  <span className="hidden max-w-40 truncate xl:block">{profile.full_name || profile.email}</span>
                  <span className="sr-only xl:hidden">{p.signedInAs}</span>
                  <Icon name="chevronRight" className="size-3.5 rotate-90 text-pt-muted" />
                </>
              }
            >
              <div className="w-64 p-1"><UserBlock profile={profile} bare /></div>
            </Dropdown>
          </div>
          <div className="ml-auto lg:hidden">
            <MobileNav profile={nav} userBlock={<UserBlock profile={profile} />} />
          </div>
        </div>
      </header>

      <main id="pt-main" tabIndex={-1} className="flex-1">
        <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-5 px-4 py-5 sm:px-6 lg:py-6">{children}</div>
      </main>
    </div>
  );
}
