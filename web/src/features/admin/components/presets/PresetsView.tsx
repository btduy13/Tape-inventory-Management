// /admin/presets body. The page calls requireRole(admin) first; reads go through the admin's RLS client.
import { format, getDictionary } from "@/i18n";
import { createClient } from "@/lib/supabase/server";
import { ROUTES } from "@/lib/routes";
import type { TapePreset } from "@/lib/types";
import {
  DataTable, FilterBar, PageHeader, Section, ToneBadge, applyListInMemory, parseListParams,
  type Column, type RawParams,
} from "@/features/portal-ui";
import { PRESETS_SPEC } from "../../lib/list-specs";
import { loadPresets } from "../../server/presets";
import { PresetActions } from "./PresetActions";
import { AddPresetDialog } from "./PresetForm";

const t = getDictionary();
const a = t.adminUi;
const BASE = ROUTES.adminPresets;
const dateFmt = new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", day: "2-digit", month: "2-digit", year: "numeric" });
const num = (v: number) => Number(v).toLocaleString("vi-VN");

const columns: Column<TapePreset>[] = [
  { key: "label", header: a.colLabel, sortKey: "label", mobile: "title", cell: (p) => (
    <span className={`font-semibold ${p.is_active ? "text-pt-text" : "text-pt-muted"}`}>{p.label}</span>
  ) },
  { key: "size", header: a.colSize, sortKey: "width", cell: (p) => (
    <span className="whitespace-nowrap tabular-nums">{format(a.sizeValue, { width: num(p.width_mm), length: num(p.length_m) })}</span>
  ) },
  { key: "thickness", header: a.colThickness, cell: (p) => <span className="tabular-nums">{format(a.thicknessValue, { value: num(p.thickness_mic) })}</span> },
  { key: "order", header: a.colOrder, sortKey: "order", align: "end", className: "w-24", cell: (p) => <span className="tabular-nums">{p.sort_order}</span> },
  { key: "status", header: a.colStatus, mobile: "badge", cell: (p) => (
    <ToneBadge tone={p.is_active ? "green" : "grey"}>{p.is_active ? a.presetShown : a.presetHidden}</ToneBadge>
  ) },
  { key: "updated", header: a.colUpdated, sortKey: "updated", className: "hidden lg:table-cell whitespace-nowrap", cell: (p) => dateFmt.format(new Date(p.updated_at)) },
  { key: "actions", header: a.colActions, cell: (p) => <PresetActions preset={p} /> },
];

export async function PresetsView({ searchParams }: { searchParams: RawParams }) {
  const { rows: all, failed } = await loadPresets(await createClient());
  const state = parseListParams(PRESETS_SPEC, searchParams);
  const { rows, total } = applyListInMemory(all, PRESETS_SPEC, state);

  return (
    <>
      <PageHeader
        title={a.presetsTitle}
        description={a.presetsIntro}
        breadcrumbs={[{ label: a.settings }, { label: a.presetsTitle }]}
        actions={<AddPresetDialog />}
      />
      <Section variant="plain">
        <FilterBar
          basePath={BASE}
          spec={PRESETS_SPEC}
          state={state}
          searchPlaceholder={a.presetsSearch}
          controls={[{ kind: "select", name: "active", label: a.colStatus, options: [{ value: "1", label: a.presetShown }, { value: "0", label: a.presetHidden }] }]}
        />
        <DataTable
          caption={a.presetsCaption}
          columns={columns}
          rows={rows}
          rowKey={(p) => p.id}
          list={{ basePath: BASE, spec: PRESETS_SPEC, state, total }}
          filtered={!!state.q || Object.keys(state.filters).length > 0}
          empty={{ title: a.presetsEmpty, body: a.presetsEmptyBody }}
          error={failed ? a.loadError : null}
        />
      </Section>
    </>
  );
}
