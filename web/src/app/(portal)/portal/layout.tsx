import type { Metadata } from "next";
import { getDictionary } from "@/i18n";
import { requireRole } from "@/lib/auth/require-role";
import { ROLE_GROUPS } from "@/lib/auth/roles";
import { AppShell } from "@/features/portal-ui";

const t = getDictionary();
export const metadata: Metadata = { title: t.nav.portal, robots: { index: false } };

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireRole(ROLE_GROUPS.portal);
  return <AppShell profile={profile}>{children}</AppShell>;
}
