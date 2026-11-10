// /admin/don-hang/[id] body, every order type: money (cost, profit, debt), customer, status actions,
// and for printed tape the workshop job (assignee, step move, history, delivery notes). Admin only:
// the page gates, admin_order_get re-checks.
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDictionary } from "@/i18n";
import { hasPerm } from "@/lib/auth/permissions";
import { createClient, getCurrentProfile } from "@/lib/supabase/server";
import { ROUTES } from "@/lib/routes";
import { PageHeader, Section } from "@/features/portal-ui/components/Section";
import { ErrorState } from "@/features/portal-ui/components/States";
import { ToneBadge } from "@/features/portal-ui/components/StatusBadge";
import { buttonClass, linkClass } from "@/features/portal-ui/components/styles";
import { AdvanceStepForm } from "@/features/workshop/components/AdvanceStepForm";
import { AssignWorkshopForm } from "@/features/workshop/components/AssignWorkshopForm";
import { vnToday } from "@/features/workshop/lib/dates";
import { listWorkshopUsers } from "@/features/workshop/server/queries";
import { TYPE_LABEL, fieldLabel as f, ordersCopy as c, type FieldKey } from "../lib/copy";
import { dateTimeVn, dateVn, instantVn, plain, toNumber, money } from "../lib/format";
import { emailHref, exportHref, orderEditHref, tabHref } from "../lib/paths";
import { OrderAttachmentsButton } from "./AttachmentsDialog";
import { listCopy as l } from "../lib/list-copy";
import { hasQuoteItems, type AdminDeliveryNote, type OrderRecord, type OrderType } from "../lib/types";
import { getOrder, originOfDetail, photoUrls } from "../server/queries";
import { OrderActions } from "./OrderActions";
import { OrdersAutoRefresh } from "./OrdersAutoRefresh";
import { OrderStatusBadges, OrderStepBadge, OriginBadge } from "./badges";

const t = getDictionary();

type Kind = "text" | "money" | "num" | "pct" | "date";
type Facts = readonly (readonly [FieldKey, Kind])[];

const CUSTOMER: Facts = [["ten_khach_hang", "text"], ["sdt_khach_hang", "text"], ["dia_chi_khach_hang", "text"], ["ngay_du_kien", "date"]];
const SALE: Facts = [["don_gia_ban", "money"], ["thanh_tien_ban", "money"], ["vat_percent", "pct"], ["vat", "money"]];
const TAIL: Facts = [["ctv", "text"], ["hoa_hong", "pct"], ["tien_hoa_hong", "money"], ["tien_ship", "money"], ["loi_nhuan", "money"], ["loi_nhuan_rong", "money"], ["cong_no_ncc", "money"]];

const SPEC: Readonly<Record<OrderType, Facts>> = {
  bang_keo_in: [
    ["quy_cach_mm", "num"], ["quy_cach_m", "num"], ["quy_cach_mic", "num"], ["cuon_cay", "num"], ["so_luong", "num"],
    ["mau_keo", "text"], ["mau_sac", "text"], ["loi_giay", "text"], ["thung_bao", "text"],
  ],
  bang_keo: [["quy_cach", "text"], ["so_luong", "num"], ["mau_sac", "text"]],
  truc_in: [["quy_cach", "text"], ["so_luong", "num"], ["mau_sac", "text"], ["mau_keo", "text"]],
  thank_you: [["kich_thuoc", "text"], ["mau_sac", "text"], ["so_luong", "num"], ["ghi_chu", "text"]],
};

const MONEY: Readonly<Record<OrderType, Facts>> = {
  bang_keo_in: [
    ["don_gia_von", "money"], ["phi_sl", "money"], ["phi_keo", "money"], ["phi_mau", "money"], ["phi_size", "money"], ["phi_cat", "money"],
    ["don_gia_goc", "money"], ["thanh_tien_goc", "money"], ...SALE, ["tien_coc", "money"], ...TAIL,
  ],
  bang_keo: [["don_gia_goc", "money"], ["thanh_tien", "money"], ...SALE, ...TAIL],
  truc_in: [["don_gia_goc", "money"], ["thanh_tien_goc", "money"], ...SALE, ...TAIL],
  thank_you: [["don_gia_von", "money"], ["thanh_tien_von", "money"], ...SALE, ["tien_coc", "money"], ...TAIL],
};

const AXIS: Facts = [
  ["ten_truc", "text"], ["truc_chu_vi", "num"], ["truc_so_luong", "num"], ["truc_gia_goc", "money"], ["truc_gia_ban", "money"],
  ["truc_thanh_tien_goc", "money"], ["truc_thanh_tien_ban", "money"], ["truc_vat_percent", "pct"], ["truc_vat", "money"],
  ["truc_ctv", "text"], ["truc_hoa_hong", "pct"], ["truc_tien_hoa_hong", "money"], ["truc_loi_nhuan_rong", "money"],
];

function value(order: OrderRecord, key: string, kind: Kind): string {
  const v = order[key];
  if (kind === "money") return money(v);
  if (kind === "num") return plain(v);
  if (kind === "pct") return toNumber(v) === null ? "—" : `${plain(v)}%`;
  if (kind === "date") return dateVn(v);
  return typeof v === "string" && v.trim() ? v : "—";
}

/** Without orders.money the RPC returns costs, CTV, commission and profit as null: those rows are dropped. */
function FactList({ order, items, money = true }: { order: OrderRecord; items: Facts; money?: boolean }) {
  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
      {items.filter(([key]) => money || order[key] !== null).map(([key, kind]) => (
        <div key={key} className="flex flex-col">
          <dt className="text-pt-muted">{f[key]}</dt>
          <dd className={`whitespace-pre-line break-words text-pt-text ${kind === "money" ? "tabular-nums" : ""}`}>{value(order, key, kind)}</dd>
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

type QuoteItem = { specification?: unknown; quantity?: unknown; total?: unknown };

export async function OrderDetailView({ id, type }: { id: string; type: OrderType }) {
  const db = await createClient();
  const load = await getOrder(db, id, type);
  if (!load.ok && load.reason === "not_found") notFound();
  if (!load.ok) return <ErrorState body={c.loadError} />;
  const { order, job, steps, delivery_notes: notes } = load.detail;
  const customerId = load.detail.customer?.id ?? null;
  const customerName = load.detail.customer?.name ?? null;
  const [photos, workshopUsers, profile] = await Promise.all([
    photoUrls(db, notes.flatMap((n) => (n.photo_path ? [n.photo_path] : []))),
    listWorkshopUsers(db),
    getCurrentProfile(),
  ]);
  const canMoney = hasPerm(profile, "orders.money");
  const printed = type === "bang_keo_in";
  const isQuote = order.is_quote === true;
  const axis = printed && order.loai_truc === "moi";
  const title = typeof order.ten_hang === "string" && order.ten_hang ? order.ten_hang : order.id;
  const payable = (toNumber(order.thanh_tien_ban) ?? 0) + (toNumber(order.vat) ?? 0)
    + (axis ? (toNumber(order.truc_thanh_tien_ban) ?? 0) + (toNumber(order.truc_vat) ?? 0) : 0);
  const net = (toNumber(order.loi_nhuan_rong) ?? 0) + (axis ? toNumber(order.truc_loi_nhuan_rong) ?? 0 : 0);
  const hasDeposit = printed || type === "thank_you";
  const items = hasQuoteItems(order) ? (order.quote_items as QuoteItem[]) : [];
  const today = vnToday();
  const listHref = tabHref(isQuote ? "quote" : type);

  const actions = (
    <>
      <OrderAttachmentsButton key={`${type}:${order.id}`} type={type} id={order.id} canEdit={hasPerm(profile, "orders.edit")} />
      {hasPerm(profile, "orders.edit") && <Link href={orderEditHref(type, order.id)} className={buttonClass("secondary")}>{c.actEdit}</Link>}
      {!isQuote && hasPerm(profile, "orders.export") && (
        <Link href={exportHref([order.id], "phieu_giao_hang")} className={buttonClass("secondary")}>{l.printNote}</Link>
      )}
      {!isQuote && hasPerm(profile, "orders.edit") && <Link href={emailHref(type, order.id)} className={buttonClass("secondary")}>{l.email}</Link>}
      {job && <Link href={ROUTES.workshopJob(job.id)} className={buttonClass("secondary")}>{c.openWorkshop}</Link>}
    </>
  );

  return (
    <>
      <OrdersAutoRefresh />
      <PageHeader
        title={title}
        description={`${TYPE_LABEL[type]} · ${order.id} · ${dateTimeVn(order.thoi_gian)}`}
        breadcrumbs={[{ label: c.title, href: listHref }, { label: order.id }]}
        meta={
          <>
            <OrderStatusBadges delivered={order.da_giao === true} settled={order.da_tat_toan === true} isQuote={isQuote} />
            {printed && !isQuote && <OrderStepBadge step={job?.step ?? null} size="md" />}
            {printed && !isQuote && <OriginBadge origin={originOfDetail(load.detail)} />}
          </>
        }
        actions={actions}
      />

      <Section title={c.secActions}>
        <OrderActions
          size="md"
          today={today}
          workshopUsers={workshopUsers}
          afterDeleteHref={listHref}
          items={[{ type, id: order.id, isQuote, delivered: order.da_giao === true, settled: order.da_tat_toan === true, hasJob: !!job }]}
        />
      </Section>

      <Section title={c.secSummary}>
        <dl className="grid grid-cols-2 gap-3 text-sm lg:grid-cols-4">
          {[
            [f.tong_cong, money(payable)],
            ...(hasDeposit ? [[f.tien_coc, money(order.tien_coc)]] : []),
            [f.cong_no_khach, order.da_tat_toan ? c.settled : money(order.cong_no_khach)],
            ...(canMoney ? [[f.loi_nhuan_rong, money(net)]] : []),
          ].map(([label, v]) => (
            <div key={label} className="flex flex-col gap-1 rounded-lg bg-pt-canvas p-3">
              <dt className="text-pt-muted">{label}</dt>
              <dd className="text-lg font-semibold tabular-nums text-pt-text">{v}</dd>
            </div>
          ))}
        </dl>
      </Section>

      <Section
        title={c.secCustomer}
        actions={customerId ? <Link href={ROUTES.adminCustomer(customerId)} className={linkClass}>{customerName ? `${c.openCustomer}: ${customerName}` : c.openCustomer}</Link> : undefined}
      >
        <FactList order={order} items={CUSTOMER} />
      </Section>

      <Section title={c.secSpec}>
        <FactList order={order} items={SPEC[type]} />
      </Section>

      {items.length > 0 && (
        <Section title={c.secQuoteItems} description={c.frozenNote}>
          <ul className="flex flex-col divide-y divide-pt-line text-sm">
            {items.map((it, i) => (
              <li key={i} className="flex flex-wrap justify-between gap-2 py-2">
                <span className="font-medium">{typeof it.specification === "string" ? it.specification : "—"}</span>
                <span className="tabular-nums text-pt-muted">{c.itemQty}: {plain(it.quantity)} · {c.itemTotal}: {money(it.total)}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {axis && (
        <Section title={c.secAxis}>
          <FactList order={order} items={AXIS} money={canMoney} />
        </Section>
      )}

      <Section title={c.secMoney}>
        <FactList order={order} items={MONEY[type]} money={canMoney} />
      </Section>

      {printed && !isQuote && (
        <Section title={c.secWorkshop}>
          {job ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <dl className="flex flex-col gap-2 text-sm">
                <div className="flex flex-col"><dt className="text-pt-muted">{f.ngay_du_kien}</dt><dd>{dateVn(job.due_date)}</dd></div>
                <div className="flex flex-col"><dt className="text-pt-muted">{f.production_note}</dt><dd className="whitespace-pre-line break-words">{job.production_note || "—"}</dd></div>
              </dl>
              <div className="flex flex-col gap-4">
                <AssignWorkshopForm jobId={job.id} users={workshopUsers} currentUserId={job.workshop_user_id} />
                <AdvanceStepForm jobId={job.id} code={order.id} step={job.step} role="admin" />
              </div>
            </div>
          ) : (
            <p className="text-sm text-pt-muted">{c.noJob}</p>
          )}
          <h3 className="text-sm font-semibold text-pt-text">{c.secSteps}</h3>
          {steps.length === 0 ? <p className="text-sm text-pt-muted">{c.noSteps}</p> : (
            <ol className="flex flex-col gap-2 text-sm">
              {steps.map((s, i) => (
                <li key={`${s.created_at}-${i}`} className="flex flex-wrap items-baseline gap-x-2 border-l-2 border-pt-line pl-3">
                  <span className="font-medium">{t.productionStep[s.to_step] ?? s.to_step}</span>
                  <span className="text-pt-muted">{instantVn(s.created_at)}{s.changed_by_name ? ` · ${s.changed_by_name}` : ""}</span>
                  {s.note && <span className="w-full break-words text-pt-muted">{s.note}</span>}
                </li>
              ))}
            </ol>
          )}
        </Section>
      )}

      {printed && !isQuote && (
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
      )}
    </>
  );
}
