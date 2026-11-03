// /admin/don-hang/[id] body: every money field of the order (cost, profit, debt) plus the workshop
// job, step history and delivery notes. Admin only: the page gates, admin_order_get re-checks.
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ROUTES } from "@/lib/routes";
import { PageHeader, Section } from "@/features/portal-ui/components/Section";
import { ErrorState } from "@/features/portal-ui/components/States";
import { ToneBadge } from "@/features/portal-ui/components/StatusBadge";
import { buttonClass, linkClass } from "@/features/portal-ui/components/styles";
import { STEP_LABEL, fieldLabel as f, ordersCopy as c, type FieldKey } from "../lib/copy";
import { dateTimeVn, dateVn, instantVn, money, plain, toNumber } from "../lib/format";
import type { AdminDeliveryNote, OrderRecord } from "../lib/types";
import { getOrder, originOfDetail, photoUrls } from "../server/queries";
import { OrderStepBadge, OriginBadge } from "./badges";

type Kind = "text" | "money" | "num" | "pct" | "date";

function value(order: OrderRecord, key: string, kind: Kind): string {
  const v = order[key];
  if (kind === "money") return money(v);
  if (kind === "num") return plain(v);
  if (kind === "pct") return toNumber(v) === null ? "—" : `${plain(v)}%`;
  if (kind === "date") return dateVn(v);
  return typeof v === "string" && v.trim() ? v : "—";
}

function Facts({ order, items }: { order: OrderRecord; items: readonly (readonly [FieldKey, Kind])[] }) {
  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
      {items.map(([key, kind]) => (
        <div key={key} className="flex flex-col">
          <dt className="text-pt-muted">{f[key]}</dt>
          <dd className={`break-words text-pt-text ${kind === "money" ? "tabular-nums" : ""}`}>{value(order, key, kind)}</dd>
        </div>
      ))}
    </dl>
  );
}

function noteState(n: AdminDeliveryNote) {
  if (n.confirmed_at) return <ToneBadge tone="green">{c.noteConfirmed}</ToneBadge>;
  if (n.revoked_at) return <ToneBadge tone="grey">{c.noteRevoked}</ToneBadge>;
  return <ToneBadge tone="blue">{c.noteOpen}</ToneBadge>;
}

export async function OrderDetailView({ id }: { id: string }) {
  const db = await createClient();
  const load = await getOrder(db, id);
  if (!load.ok && load.reason === "not_found") notFound();
  if (!load.ok) return <ErrorState body={c.loadError} />;
  const { order, job, steps, delivery_notes: notes } = load.detail;
  const photos = await photoUrls(db, notes.flatMap((n) => (n.photo_path ? [n.photo_path] : [])));
  const axis = order.loai_truc === "moi";
  const title = typeof order.ten_hang === "string" && order.ten_hang ? order.ten_hang : order.id;
  const payable = (toNumber(order.thanh_tien_ban) ?? 0) + (toNumber(order.vat) ?? 0)
    + (axis ? (toNumber(order.truc_thanh_tien_ban) ?? 0) + (toNumber(order.truc_vat) ?? 0) : 0);
  const net = (toNumber(order.loi_nhuan_rong) ?? 0) + (axis ? toNumber(order.truc_loi_nhuan_rong) ?? 0 : 0);

  return (
    <>
      <PageHeader
        title={title}
        description={`${order.id} · ${dateTimeVn(order.thoi_gian)}`}
        breadcrumbs={[{ label: c.title, href: ROUTES.adminOrders }, { label: order.id }]}
        meta={<><OrderStepBadge step={job?.step ?? null} size="md" /><OriginBadge origin={originOfDetail(load.detail)} /></>}
        actions={job ? <Link href={ROUTES.workshopJob(job.id)} className={buttonClass("secondary")}>{c.openWorkshop}</Link> : undefined}
      />

      <Section title={c.secSummary}>
        <dl className="grid grid-cols-2 gap-3 text-sm lg:grid-cols-4">
          {[
            [f.tong_cong, money(payable)],
            [f.tien_coc, money(order.tien_coc)],
            [f.cong_no_khach, order.da_tat_toan ? c.settled : money(order.cong_no_khach)],
            [f.loi_nhuan_rong, money(net)],
          ].map(([label, v]) => (
            <div key={label} className="flex flex-col gap-1 rounded-lg bg-pt-canvas p-3">
              <dt className="text-pt-muted">{label}</dt>
              <dd className="text-lg font-semibold tabular-nums text-pt-text">{v}</dd>
            </div>
          ))}
        </dl>
      </Section>

      <Section title={c.secCustomer}>
        <Facts order={order} items={[["ten_khach_hang", "text"], ["sdt_khach_hang", "text"], ["dia_chi_khach_hang", "text"], ["ngay_du_kien", "date"]]} />
      </Section>

      <Section title={c.secSpec}>
        <Facts order={order} items={[
          ["quy_cach_mm", "num"], ["quy_cach_m", "num"], ["quy_cach_mic", "num"], ["cuon_cay", "num"], ["so_luong", "num"],
          ["mau_keo", "text"], ["mau_sac", "text"], ["loi_giay", "text"], ["thung_bao", "text"],
        ]} />
      </Section>

      <Section title={c.secMoney}>
        <Facts order={order} items={[
          ["don_gia_von", "money"], ["phi_sl", "money"], ["phi_keo", "money"], ["phi_mau", "money"], ["phi_size", "money"], ["phi_cat", "money"],
          ["don_gia_goc", "money"], ["thanh_tien_goc", "money"], ["don_gia_ban", "money"], ["thanh_tien_ban", "money"],
          ["vat_percent", "pct"], ["vat", "money"], ["ctv", "text"], ["hoa_hong", "pct"], ["tien_hoa_hong", "money"],
          ["tien_ship", "money"], ["loi_nhuan", "money"], ["loi_nhuan_rong", "money"], ["cong_no_ncc", "money"],
        ]} />
      </Section>

      {axis && (
        <Section title={c.secAxis}>
          <Facts order={order} items={[
            ["ten_truc", "text"], ["truc_chu_vi", "num"], ["truc_so_luong", "num"], ["truc_gia_goc", "money"], ["truc_gia_ban", "money"],
            ["truc_thanh_tien_goc", "money"], ["truc_thanh_tien_ban", "money"], ["truc_vat_percent", "pct"], ["truc_vat", "money"],
            ["truc_ctv", "text"], ["truc_hoa_hong", "pct"], ["truc_tien_hoa_hong", "money"], ["truc_loi_nhuan_rong", "money"],
          ]} />
        </Section>
      )}

      <Section title={c.secWorkshop}>
        {job ? (
          <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
            <div className="flex flex-col"><dt className="text-pt-muted">{f.workshop_user_id}</dt><dd>{job.workshop_user_name ?? c.unassigned}</dd></div>
            <div className="flex flex-col"><dt className="text-pt-muted">{f.ngay_du_kien}</dt><dd>{dateVn(job.due_date)}</dd></div>
            <div className="flex flex-col"><dt className="text-pt-muted">{f.production_note}</dt><dd className="whitespace-pre-line break-words">{job.production_note || "—"}</dd></div>
          </dl>
        ) : (
          <p className="text-sm text-pt-muted">{c.noJob}</p>
        )}
        <h3 className="text-sm font-semibold text-pt-text">{c.secSteps}</h3>
        {steps.length === 0 ? <p className="text-sm text-pt-muted">{c.noSteps}</p> : (
          <ol className="flex flex-col gap-2 text-sm">
            {steps.map((s, i) => (
              <li key={`${s.created_at}-${i}`} className="flex flex-wrap items-baseline gap-x-2 border-l-2 border-pt-line pl-3">
                <span className="font-medium">{STEP_LABEL[s.to_step] ?? s.to_step}</span>
                <span className="text-pt-muted">{instantVn(s.created_at)}{s.changed_by_name ? ` · ${s.changed_by_name}` : ""}</span>
                {s.note && <span className="w-full break-words text-pt-muted">{s.note}</span>}
              </li>
            ))}
          </ol>
        )}
      </Section>

      <Section title={c.secNotes}>
        {notes.length === 0 ? <p className="text-sm text-pt-muted">{c.noNotes}</p> : (
          <ul className="flex flex-col gap-3 text-sm">
            {notes.map((n) => (
              <li key={n.id} className="flex flex-col gap-1 rounded-lg border border-pt-line p-3">
                <span className="flex flex-wrap items-center gap-2">{noteState(n)}<span className="text-pt-muted">{c.createdAt} {instantVn(n.created_at)}</span></span>
                <span className="break-words">{[n.recipient_name, n.recipient_phone, n.recipient_address].filter(Boolean).join(" · ") || "—"}</span>
                {n.confirmed_at && <span className="text-pt-muted">{c.noteConfirmed}: {instantVn(n.confirmed_at)}</span>}
                {n.photo_path && photos.get(n.photo_path) && (
                  <a href={photos.get(n.photo_path)} target="_blank" rel="noreferrer noopener" className={linkClass}>{c.viewPhoto}</a>
                )}
              </li>
            ))}
          </ul>
        )}
      </Section>
    </>
  );
}
