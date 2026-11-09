"use client";
// Tab-aware nav list (sidebar + drawer). Active item: yellow tape strip on the left.
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
          {groups.length > 1 && <p className="px-3 text-xs font-medium text-white/65">{p[g.labelKey]}</p>}
          <ul className="flex flex-col gap-0.5">
            {g.items.map((item) => {
              const active = isNavActive(pathname, item);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={`relative flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium ${
                      active ? "bg-white/12 text-white" : "text-white/80 hover:bg-white/8 hover:text-white"
                    }`}
                  >
                    {active && <span aria-hidden className="absolute inset-y-2 left-0 w-1.5 -translate-x-1 rounded-sm bg-vt-yellow" />}
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
