import type { Metadata } from "next";
import { getDictionary } from "@/i18n";
import { requireRole } from "@/lib/auth/require-role";
import { ROLE_GROUPS } from "@/lib/auth/roles";
import { AppShell } from "@/features/portal-ui";

const t = getDictionary();
export const metadata: Metadata = { title: t.nav.admin, robots: { index: false } };

// Any portal user may enter: orders / quotes / customers gate on tab + permission (requireTab),
// /admin/leads/[id] on pricing, and overview, users, quy cách and presets on admin, each in its own page.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireRole(ROLE_GROUPS.portal);
  return <AppShell profile={profile}>{children}</AppShell>;
}
