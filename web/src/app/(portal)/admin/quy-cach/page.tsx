import { getDictionary } from "@/i18n";
import { requireRole } from "@/lib/auth/require-role";
import { ROLE_GROUPS } from "@/lib/auth/roles";
import { TapeSpecsSection } from "@/features/admin";

const t = getDictionary();

export default async function AdminTapeSpecsPage() {
  await requireRole(ROLE_GROUPS.admin);
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">{t.tapeSpec.title}</h1>
      <TapeSpecsSection />
    </div>
  );
}
