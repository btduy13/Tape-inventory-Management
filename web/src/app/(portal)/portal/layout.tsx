import type { Metadata } from "next";
import { getDictionary } from "@/i18n";
import { requireRole } from "@/lib/auth/require-role";
import { ROLE_GROUPS } from "@/lib/auth/roles";
import { PortalHeader } from "@/features/orders";

const t = getDictionary();
export const metadata: Metadata = { title: t.nav.portal, robots: { index: false } };

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireRole(ROLE_GROUPS.internal);
  return (
    <>
      <PortalHeader profile={profile} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{children}</main>
    </>
  );
}
