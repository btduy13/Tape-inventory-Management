import type { Metadata } from "next";
import Link from "next/link";
import { getDictionary } from "@/i18n";
import { AuthCard, RESET_REQUEST_PATH, UpdatePasswordForm, hasAuthSession } from "@/features/auth";

const t = getDictionary();
export const metadata: Metadata = { title: t.auth.updatePasswordTitle, robots: { index: false } };

export default async function UpdatePasswordPage() {
  const ok = await hasAuthSession();
  return (
    <AuthCard title={t.auth.updatePasswordTitle}>
      {ok ? (
        <UpdatePasswordForm />
      ) : (
        <p className="text-sm text-neutral-700">
          {t.auth.linkInvalid}{" "}
          <Link href={RESET_REQUEST_PATH} className="text-amber-800 hover:underline">{t.auth.resetTitle}</Link>
        </p>
      )}
    </AuthCard>
  );
}
