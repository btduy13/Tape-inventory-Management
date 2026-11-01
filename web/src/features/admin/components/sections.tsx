// Server-rendered admin page sections. Pages must call requireRole() first; these
// sections query through the admin's RLS client, so a non-admin would see nothing anyway.
import { getDictionary } from "@/i18n";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";
import { listPresets } from "../server/presets";
import { leadStatusCounts, listUsers } from "../server/queries";
import { InviteUserForm } from "./InviteUserForm";
import { PresetForm } from "./PresetForm";
import { StatusCounts } from "./StatusCounts";
import { UserRowForm } from "./UserRowForm";

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

export async function UsersSection({ actor }: { actor: Profile }) {
  const users = await listUsers(await createClient());
  return (
    <div className="flex flex-col gap-6">
      <InviteUserForm />
      <section className="rounded-lg border border-neutral-200 p-4">
        <h2 className="mb-2 font-semibold">{t.admin.users}</h2>
        <ul>
          {users.map((u) => <UserRowForm key={u.id} user={u} isSelf={u.id === actor.id} />)}
        </ul>
      </section>
    </div>
  );
}

export async function PresetsSection() {
  const presets = await listPresets(await createClient());
  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-lg border border-neutral-200 p-4">
        <h2 className="mb-2 font-semibold">{t.admin.addPreset}</h2>
        <PresetForm />
      </section>
      <section className="rounded-lg border border-neutral-200 p-4">
        <h2 className="mb-2 font-semibold">{t.admin.presets}</h2>
        {presets.length === 0 ? (
          <p className="text-sm text-neutral-500">{t.common.none}</p>
        ) : (
          presets.map((p) => <PresetForm key={`${p.id}:${p.updated_at}`} preset={p} />)
        )}
      </section>
    </div>
  );
}
