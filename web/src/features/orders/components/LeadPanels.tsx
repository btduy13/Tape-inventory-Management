// Lead detail: customer card and design/spec card (server components, read-only).
import { format, getDictionary } from "@/i18n";
import { designBorderOf, designPatternOf, type Design, type Lead } from "@/lib/types";
import { Icon, Section, ToneBadge, buttonClass } from "@/features/portal-ui";
import { INK_LIMIT, inkSummary } from "../lib/design-info";
import { formatDateTime } from "../lib/timeline";

const t = getDictionary();
const c = t.leadsUi;

const borderLabel = (b: ReturnType<typeof designBorderOf>) =>
  b ? `${t.designBorder[b.style]} ${b.widthMm}mm` : t.designBorder.none;

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[minmax(6rem,9rem)_1fr] gap-3 py-2 text-sm">
      <dt className="text-pt-muted">{label}</dt>
      <dd className="min-w-0 break-words text-pt-text">{children ?? "—"}</dd>
    </div>
  );
}

/** Colour chip as SVG (fill attribute, not an inline style: CSP). */
function Swatch({ hex, label }: { hex: string; label?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-pt-line py-0.5 pl-1 pr-2.5 text-xs">
      <svg aria-hidden viewBox="0 0 16 16" className="size-4"><circle cx="8" cy="8" r="7" fill={hex} stroke="#b9bed3" /></svg>
      <span className="font-medium uppercase tabular-nums">{label ?? hex}</span>
    </span>
  );
}

export function CustomerPanel({ lead, assigneeName }: { lead: Lead; assigneeName: string | null }) {
  return (
    <Section title={c.panelCustomer}>
      <div className="flex flex-wrap gap-2">
        <a href={`tel:${lead.phone}`} className={buttonClass("secondary", "sm")}>{format(c.callCustomer, { phone: lead.phone })}</a>
        {lead.email && <a href={`mailto:${lead.email}`} className={buttonClass("ghost", "sm")}>{c.emailCustomer}</a>}
      </div>
      <dl className="divide-y divide-pt-line">
        <Row label={t.orders.customer}>{lead.customer_name}</Row>
        <Row label={t.orders.company}>{lead.company}</Row>
        <Row label={t.orders.phone}>{lead.phone}</Row>
        <Row label={t.orders.email}>{lead.email}</Row>
        <Row label={t.orders.quantity}>{lead.quantity.toLocaleString("vi-VN")}</Row>
        <Row label={t.orders.customerNote}>{lead.customer_note ? <span className="whitespace-pre-wrap">{lead.customer_note}</span> : null}</Row>
        <Row label={t.orders.assignee}>{assigneeName ?? (lead.assigned_to ? "—" : <span className="text-pt-red-ink">{c.unassigned}</span>)}</Row>
        <Row label={c.receivedAt}>{formatDateTime(lead.created_at)}</Row>
        {lead.production_order_id && <Row label={t.orders.productionOrder}><span className="font-semibold">{lead.production_order_id}</span></Row>}
      </dl>
    </Section>
  );
}

export function DesignPanel({ code, design, previewUrl }: { code: string; design: Design | null; previewUrl: string | null }) {
  if (!design) {
    return (
      <Section title={c.panelDesign}>
        <p className="text-sm text-pt-muted">{c.noDesign}</p>
      </Section>
    );
  }
  const ink = inkSummary(design);
  return (
    <Section title={c.panelDesign}>
      <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL, not optimisable
          <img src={previewUrl} alt={format(c.previewAlt, { code })} className="max-h-72 w-full rounded-lg border border-pt-line bg-pt-canvas object-contain" />
        ) : (
          <div className="flex min-h-40 items-center justify-center rounded-lg border border-dashed border-pt-line-strong text-sm text-pt-muted">{c.noDesign}</div>
        )}
        <dl className="divide-y divide-pt-line">
          <Row label={c.tapeSize}>
            <span className="text-base font-semibold">{format(c.tapeSizeValue, { width: Number(design.width_mm), length: Number(design.length_m) })}</span>
          </Row>
          <Row label={c.thickness}>{format(c.thicknessValue, { value: Number(design.thickness_mic) })}</Row>
          <Row label={c.inks}>
            <span className="flex flex-col gap-1.5">
              <span className="flex flex-wrap items-center gap-2">
                <span className="font-semibold">{format(c.inkValue, { count: ink.count, max: INK_LIMIT })}</span>
                {ink.over ? <ToneBadge tone="red">{c.inkOverBadge}</ToneBadge> : <ToneBadge tone="green">{c.inkOkBadge}</ToneBadge>}
              </span>
              {ink.over && (
                <span className="flex items-start gap-1.5 text-xs text-pt-red-ink">
                  <Icon name="alert" className="mt-0.5 size-3.5 shrink-0" />
                  {format(c.inkOver, { max: INK_LIMIT })}
                </span>
              )}
            </span>
          </Row>
          {ink.tape && <Row label={c.tapeColor}><Swatch hex={ink.tape} /></Row>}
          <Row label={c.printColors}>
            {ink.inks.length > 0 ? <span className="flex flex-wrap gap-1.5">{ink.inks.map((h) => <Swatch key={h} hex={h} />)}</span> : null}
          </Row>
          <Row label={c.printText}><span className="whitespace-pre-line">{design.print_text}</span></Row>
          <Row label={c.logo}>
            {ink.hasLogo ? c.hasLogo : c.noLogo}
            {ink.hasLogo && design.design_json?.logo?.rotation ? ` · ${format(c.logoRotated, { deg: design.design_json.logo.rotation })}` : null}
            {ink.hasLogo && design.design_json?.logo?.autoClean ? ` · ${c.logoAutoCleaned}` : null}
            {ink.hasLogo && design.design_json?.logo?.mono ? ` · ${format(c.logoMono, { hex: design.design_json.logo.mono.color })}` : null}
          </Row>
          <Row label={c.pattern}>{t.designPattern[designPatternOf(design.design_json)]}</Row>
          <Row label={c.border}>{borderLabel(designBorderOf(design.design_json))}</Row>
        </dl>
      </div>
    </Section>
  );
}
