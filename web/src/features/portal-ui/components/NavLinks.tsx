"use client";
// Tab-aware nav list (sidebar + drawer). Active item: blue tint pill.
import Link from "next/link";
import { usePathname } from "next/navigation";
import { getDictionary } from "@/i18n";
import type { AccessProfile } from "@/lib/auth/permissions";
import { isNavActive, navFor } from "../lib/nav";
import { Icon } from "./Icon";

const p = getDictionary().portalUi;

export function NavLinks({ profile, onNavigate }: { profile: AccessProfile; onNavigate?: () => void }) {
  const pathname = usePathname() ?? "";
  const groups = navFor(profile);
  return (
    <div className="flex flex-col gap-6">
      {groups.map((g) => (
        <div key={g.labelKey} className="flex flex-col gap-1">
          {groups.length > 1 && <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-pt-muted">{p[g.labelKey]}</p>}
          <ul className="flex flex-col gap-0.5">
            {g.items.map((item) => {
              const active = isNavActive(pathname, item);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={`flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm transition-colors lg:min-h-10 ${
                      active ? "bg-pt-blue-tint font-semibold text-pt-blue-ink" : "font-medium text-pt-muted hover:bg-pt-grey-tint hover:text-pt-text"
                    }`}
                  >
                    <Icon name={item.icon} />
                    {p[item.labelKey]}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}
