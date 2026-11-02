import type { Metadata } from "next";
import { getDictionary } from "@/i18n";
import { requireRole } from "@/lib/auth/require-role";
import { ROLE_GROUPS } from "@/lib/auth/roles";
import { AppShell } from "@/features/portal-ui";

const t = getDictionary();
export const metadata: Metadata = { title: t.nav.admin, robots: { index: false } };

// Managers may open /admin/leads/[id]; overview, users and presets pages require admin themselves.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireRole(ROLE_GROUPS.pricing);
  return <AppShell profile={profile}>{children}</AppShell>;
}
