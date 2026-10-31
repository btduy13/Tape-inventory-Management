import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getDictionary } from "@/i18n";
import { ROUTES } from "@/lib/routes";
import { safeNextPath } from "@/lib/security/safe-redirect";
import { AuthCard, LoginForm, isLoggedInActiveUser } from "@/features/auth";

const t = getDictionary();
export const metadata: Metadata = { title: t.nav.login, robots: { index: false } };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function LoginPage({ searchParams }: Props) {
  const sp = await searchParams;
  const next = safeNextPath(typeof sp.next === "string" ? sp.next : null, ROUTES.portal);
  if (await isLoggedInActiveUser()) redirect(next);
  return (
    <AuthCard title={t.auth.loginTitle}>
      <LoginForm next={next} linkError={sp.error === "link"} />
    </AuthCard>
  );
}
