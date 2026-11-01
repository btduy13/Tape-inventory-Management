import Link from "next/link";
import { getDictionary } from "@/i18n";
import { ROUTES } from "@/lib/routes";
import { canAssign, canUseWorkshop, isWorkshop } from "@/lib/auth/roles";
import type { Profile } from "@/lib/types";
import { LogoutButton } from "@/features/auth";

const t = getDictionary();

/** Shared header for /portal and /admin layouts. */
export function PortalHeader({ profile }: { profile: Profile }) {
  return (
    <header className="border-b border-neutral-200 bg-white">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <nav className="flex flex-wrap items-center gap-4 text-sm">
          <Link href={isWorkshop(profile) ? ROUTES.workshop : ROUTES.portal} className="font-semibold text-amber-800">{t.common.appName}</Link>
          {!isWorkshop(profile) && <Link href={ROUTES.portal} className="hover:underline">{t.nav.portal}</Link>}
          {canUseWorkshop(profile) && <Link href={ROUTES.workshop} className="hover:underline">{t.nav.workshop}</Link>}
          {canAssign(profile) && (
            <>
              <Link href={ROUTES.admin} className="hover:underline">{t.nav.admin}</Link>
              <Link href={ROUTES.adminUsers} className="hover:underline">{t.nav.users}</Link>
              <Link href={ROUTES.adminPresets} className="hover:underline">{t.nav.presets}</Link>
            </>
          )}
        </nav>
        <div className="flex items-center gap-2 text-sm text-neutral-600">
          <span>
            {profile.full_name || profile.email} · {t.roles[profile.role]}
          </span>
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}
