import type { Metadata } from "next";
import { getDictionary } from "@/i18n";
import { AuthCard, ResetRequestForm } from "@/features/auth";

const t = getDictionary();
export const metadata: Metadata = { title: t.auth.resetTitle, robots: { index: false } };

export default function ResetPasswordPage() {
  return (
    <AuthCard title={t.auth.resetTitle}>
      <ResetRequestForm />
    </AuthCard>
  );
}
