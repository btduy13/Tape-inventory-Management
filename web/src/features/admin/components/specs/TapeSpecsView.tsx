// /admin/quy-cach body: widths the customer can pick + roll length range / default thickness.
// The page calls requireRole(admin) first; reads go through the admin's RLS client.
import { format, getDictionary } from "@/i18n";
import { createClient } from "@/lib/supabase/server";
import { ROUTES } from "@/lib/routes";
import type { TapeWidth } from "@/lib/types";
import {
  DataTable, ErrorState, FilterBar, InlineStatus, PageHeader, Section, ToneBadge, applyListInMemory,
  parseListParams, type Column, type RawParams,
} from "@/features/portal-ui";
import { canReorder, WIDTHS_SPEC } from "../../lib/list-specs";
import { loadTapeSpecs } from "../../server/tape-specs";
import { AddWidthForm, LengthLimitsForm } from "./SpecForms";
import { WidthActions } from "./WidthActions";

const t = getDictionary();
const a = t.adminUi;
const BASE = ROUTES.adminTapeSpecs;

export async function TapeSpecsView({ searchParams }: { searchParams: RawParams }) {
  const { widths, settings, failed } = await loadTapeSpecs(await createClient());
  const state = parseListParams(WIDTHS_SPEC, searchParams);
  const { rows, total } = applyListInMemory(widths, WIDTHS_SPEC, state);
  const reorderable = canReorder(WIDTHS_SPEC, state);
  const position = new Map(widths.map((w, i) => [w.id, i]));
  const activeCount = widths.filter((w) => w.is_active).length;

  const columns: Column<TapeWidth>[] = [
    { key: "order", header: a.colOrder, sortKey: "order", mobile: "hidden", className: "w-24", cell: (w) => (
      <span className="tabular-nums text-pt-muted">{(position.get(w.id) ?? 0) + 1}</span>
    ) },
    { key: "width", header: a.colWidth, sortKey: "width", mobile: "title", cell: (w) => (
      <span className={`text-base font-semibold tabular-nums ${w.is_active ? "text-pt-text" : "text-pt-muted line-through"}`}>
        {format(t.tapeSpec.widthOption, { width: w.width_mm })}
      </span>
    ) },
    { key: "status", header: a.colStatus, mobile: "badge", cell: (w) => (
      <ToneBadge tone={w.is_active ? "green" : "grey"}>{w.is_active ? a.widthShown : a.widthHidden}</ToneBadge>
    ) },
    { key: "actions", header: a.colActions, cell: (w) => {
      const i = position.get(w.id) ?? 0;
      return <WidthActions width={w} reorder={reorderable ? { isFirst: i === 0, isLast: i === widths.length - 1 } : null} />;
    } },
  ];

  return (
    <>
      <PageHeader
        title={t.tapeSpec.title}
        description={a.specsIntro}
        breadcrumbs={[{ label: a.settings }, { label: t.tapeSpec.title }]}
      />
      {failed ? (
        <ErrorState body={a.loadError} />
      ) : (
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <Section title={t.tapeSpec.widthsTitle} description={format(t.tapeSpec.activeCount, { count: activeCount })}>
            <AddWidthForm />
            <FilterBar
              basePath={BASE}
              spec={WIDTHS_SPEC}
              state={state}
              searchPlaceholder={a.widthsSearch}
              controls={[{ kind: "select", name: "active", label: a.colStatus, options: [{ value: "1", label: a.widthShown }, { value: "0", label: a.widthHidden }] }]}
            />
            {!reorderable && widths.length > 1 && <InlineStatus tone="info">{a.reorderHint}</InlineStatus>}
            <DataTable
              caption={a.widthsCaption}
              columns={columns}
              rows={rows}
              rowKey={(w) => w.id}
              list={{ basePath: BASE, spec: WIDTHS_SPEC, state, total }}
              filtered={!!state.q || Object.keys(state.filters).length > 0}
              empty={{ title: t.tapeSpec.noWidths, body: a.noWidthsBody }}
            />
          </Section>
          <Section title={t.tapeSpec.lengthTitle} description={settings ? format(a.lengthPreview, { min: settings.min_length_m, max: settings.max_length_m, thickness: settings.thickness_mic }) : undefined}>
            <LengthLimitsForm key={settings?.updated_at ?? "none"} settings={settings} />
          </Section>
        </div>
      )}
    </>
  );
}
