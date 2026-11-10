"use client";
// Tab-aware nav. "bar": the desktop top bar (work tabs in a row, the other groups as dropdowns).
// "list": the phone drawer (grouped vertical list).
import Link from "next/link";
import { usePathname } from "next/navigation";
import { getDictionary } from "@/i18n";
import type { AccessProfile } from "@/lib/auth/permissions";
import { isNavActive, navFor, type NavItem } from "../lib/nav";
import { Dropdown } from "./Dropdown";
import { Icon } from "./Icon";

const p = getDictionary().portalUi;

type Props = { profile: AccessProfile; variant?: "bar" | "list"; onNavigate?: () => void };

const listItem = (active: boolean) =>
  `flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm transition-colors lg:min-h-10 ${
    active ? "bg-pt-blue-tint font-semibold text-pt-blue-ink" : "font-medium text-pt-muted hover:bg-pt-grey-tint hover:text-pt-text"
  }`;
const barItem = (active: boolean) =>
  `flex h-14 items-center gap-2 whitespace-nowrap border-b-2 px-2.5 text-sm transition-colors xl:px-3 ${
    active ? "border-vt-blue font-semibold text-pt-blue-ink" : "border-transparent font-medium text-pt-muted hover:border-pt-line-strong hover:text-pt-text"
  }`;

export function NavLinks({ profile, variant = "list", onNavigate }: Props) {
  const pathname = usePathname() ?? "";
  const groups = navFor(profile);
  const link = (item: NavItem, cls: (active: boolean) => string, iconClass?: string) => {
    const active = isNavActive(pathname, item);
    return (
      <li key={item.href}>
        <Link href={item.href} onClick={onNavigate} aria-current={active ? "page" : undefined} className={cls(active)}>
          <Icon name={item.icon} className={iconClass} />
          {p[item.labelKey]}
        </Link>
      </li>
    );
  };

  if (variant === "bar") {
    return (
      <ul className="flex items-center">
        {groups.map((g) =>
          g.labelKey === "navWork" ? g.items.map((item) => link(item, barItem, "hidden size-4.5 xl:block")) : (
            <li key={g.labelKey}>
              <Dropdown
                summaryClass={barItem(g.items.some((i) => isNavActive(pathname, i)))}
                summary={<>{p[g.labelKey]}<Icon name="chevronRight" className="size-3.5 rotate-90" /></>}
              >
                <ul className="flex flex-col gap-0.5">{g.items.map((item) => link(item, listItem))}</ul>
              </Dropdown>
            </li>
          ),
        )}
      </ul>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {groups.map((g) => (
        <div key={g.labelKey} className="flex flex-col gap-1">
          {groups.length > 1 && <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-pt-muted">{p[g.labelKey]}</p>}
          <ul className="flex flex-col gap-0.5">{g.items.map((item) => link(item, listItem))}</ul>
        </div>
      ))}
    </div>
  );
}
