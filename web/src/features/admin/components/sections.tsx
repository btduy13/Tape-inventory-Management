// Server-rendered admin page sections. Pages must call requireRole() first; these
// sections query through the admin's RLS client, so a non-admin would see nothing anyway.
import { getDictionary } from "@/i18n";
import { createClient } from "@/lib/supabase/server";
import { leadStatusCounts } from "../server/queries";
import { StatusCounts } from "./StatusCounts";

const t = getDictionary();

export async function AdminOverview() {
  const counts = await leadStatusCounts(await createClient());
  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-semibold">{t.admin.leadsByStatus}</h2>
      <StatusCounts counts={counts} />
    </section>
  );
}
