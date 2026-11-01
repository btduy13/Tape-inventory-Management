"use client";
// Product configurator layout. Must be inside <DesignProvider>.
//   desktop: sticky stage (2D strip + 3D) on the left, step accordion on the right
//   mobile:  pinnable 2D stage on top, steps, 3D, bottom action bar
// `quote` is the quote form (lead-intake's DesignLeadForm), rendered inside step 4 so features stay
// decoupled. Collapsed steps stay mounted (`hidden`) so typed values and the form state survive.
// `contact` (optional, from the page's CONTACT_* env) gives the over-3-ink dialog a call / Zalo button;
// without it "Liên hệ tư vấn" opens the quote step.
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { format, getDictionary } from "@/i18n";
import { QUOTE_ANCHOR, VIEW3D_ANCHOR } from "./anchors";
import { DesignMockupBridge } from "./DesignMockupBridge";
import { ColorDots, DesignSummary, useDesignSummary } from "./DesignSummary";
import { ExportButtons } from "./ExportButtons";
import { InkLimitDialog, type DesignerContact } from "./InkLimitDialog";
import { LogoUpload } from "./LogoUpload";
import { MobileActionBar } from "./MobileActionBar";
import { PalettePicker } from "./PalettePicker";
import { PresetPicker } from "./PresetPicker";
import { TapeCanvas2D } from "./TapeCanvas2D";
import { TemplatePicker } from "./TemplatePicker";
import { TextTool } from "./TextTool";
import { barClearancePb, barClearanceScrollMb, btnPrimary, btnSecondary, card, focusRing, scrollToEl } from "./ui";

type StepId = "spec" | "content" | "colors" | "quote";
const ORDER: readonly StepId[] = ["spec", "content", "colors", "quote"];

export function DesignerPanel({ quote, contact }: { quote?: ReactNode; contact?: DesignerContact | null }) {
  const t = getDictionary().designer;
  const sum = useDesignSummary();
  const [open, setOpen] = useState<StepId | null>("spec");
  const [pinned, setPinned] = useState(true);
  const refs = useRef<Partial<Record<StepId, HTMLElement | null>>>({});

  const goTo = useCallback((id: StepId) => {
    setOpen(id);
    // Wait for the panel to expand before scrolling its header into view.
    requestAnimationFrame(() => scrollToEl(refs.current[id] ?? null));
  }, []);
  const toggle = (id: StepId) => {
    const opening = open !== id;
    setOpen(opening ? id : null);
    // Collapsing the step above can push the header off-screen: bring it back.
    if (opening) {
      requestAnimationFrame(() => {
        const el = refs.current[id];
        if (el && el.getBoundingClientRect().top < 0) scrollToEl(el);
      });
    }
  };
  const next = (id: StepId) => goTo(ORDER[ORDER.indexOf(id) + 1] ?? "quote");
  // "nearest" + the card's scroll margins: the whole card ends up between the top and the action bar.
  const changeLogo = useCallback(() => {
    // Same user gesture: open the file picker, then show the content step behind it.
    document.querySelector<HTMLInputElement>('input[data-testid="logo-input"]')?.click();
    goTo("content");
  }, [goTo]);
  const show3d = useCallback(() => scrollToEl(document.getElementById(VIEW3D_ANCHOR), "nearest"), []);

  // Deep link from landing CTAs: /thiet-ke#yeu-cau-bao-gia opens the quote step.
  useEffect(() => {
    const onHash = () => {
      if (window.location.hash === `#${QUOTE_ANCHOR}`) goTo("quote");
    };
    onHash();
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, [goTo]);

  const step = (id: StepId, n: number, title: string, summary: ReactNode, body: ReactNode, opts: { bad?: boolean; anchor?: string } = {}) => (
    <Step
      key={id}
      id={id}
      n={n}
      title={title}
      summary={summary}
      bad={opts.bad}
      anchor={opts.anchor}
      open={open === id}
      onToggle={() => toggle(id)}
      sectionRef={(el) => {
        refs.current[id] = el;
      }}
    >
      {body}
    </Step>
  );
  const nextBtn = (id: StepId) => (
    <button type="button" onClick={() => next(id)} className={`${btnSecondary} mt-6 w-full sm:w-auto sm:self-end`}>
      {t.next}
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
    </button>
  );

  return (
    <div className={`grid grid-cols-1 gap-4 ${barClearancePb} lg:grid-cols-[minmax(0,1fr)_400px] lg:items-start lg:gap-6 xl:grid-cols-[minmax(0,1fr)_440px] xl:gap-8`}>
      {/* Stage column: display:contents on mobile so its cards can be ordered around the steps. */}
      <div className="contents lg:sticky lg:top-4 lg:flex lg:min-w-0 lg:flex-col lg:gap-4">
        <section
          aria-labelledby="designer-stage-title"
          className={`order-1 min-w-0 ${card} p-3 sm:p-4 lg:order-none ${pinned && open !== "quote" ? "sticky top-2 z-20 shadow-lg shadow-slate-900/5 lg:static lg:shadow-none" : ""}`}
        >
          <div className="mb-2 flex min-w-0 items-center justify-between gap-2 sm:mb-3">
            <div className="flex min-w-0 items-baseline gap-2">
              <h2 id="designer-stage-title" className="shrink-0 text-sm font-semibold text-slate-900">{t.stageTitle}</h2>
              <span className={`truncate text-xs tabular-nums ${sum.lengthOk ? "text-slate-600" : "font-medium text-red-700"}`}>{sum.size}</span>
            </div>
            <div className="-my-2 ml-auto hidden sm:block">
              <ExportButtons />
            </div>
            <button
              type="button"
              aria-pressed={pinned}
              aria-label={t.pinPreview}
              title={t.pinPreview}
              onClick={() => setPinned((p) => !p)}
              className={`-my-2 -mr-1 h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-lg lg:hidden ${open === "quote" ? "hidden" : "inline-flex"} ${pinned ? "text-vt-navy" : "text-slate-500"} hover:bg-slate-100 ${focusRing}`}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill={pinned ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" aria-hidden="true">
                <path d="M9 3h6l-1 6 4 4H6l4-4-1-6Z" /><path d="M12 13v8" fill="none" />
              </svg>
            </button>
          </div>
          <div className="rounded-xl bg-slate-100 p-2.5 sm:p-4">
            <TapeCanvas2D />
          </div>
        </section>
        <section id={VIEW3D_ANCHOR} className={`order-3 min-w-0 scroll-mt-4 ${barClearanceScrollMb} ${card} p-3 sm:p-4 lg:order-none`}>
          <h2 className="mb-2 text-sm font-semibold text-slate-900 sm:mb-3">{getDictionary().mockup3d.title}</h2>
          <DesignMockupBridge showTitle={false} aspect="16 / 9" mobileAspect="1 / 1" />
        </section>
      </div>

      <div className="order-2 flex min-w-0 flex-col gap-3 lg:order-none">
        <div role="group" aria-label={t.stepsLabel} className="flex flex-col gap-3">
          {step("spec", 1, t.stepSpec, sum.size, <div className="flex flex-col"><PresetPicker />{nextBtn("spec")}</div>, { bad: !sum.lengthOk })}
          {step(
            "content",
            2,
            t.stepContent,
            sum.content,
            <div className="flex flex-col">
              <div className="flex flex-col gap-6">
                <TemplatePicker />
                <hr className="border-slate-100" />
                <TextTool />
                <hr className="border-slate-100" />
                <LogoUpload />
              </div>
              {nextBtn("content")}
            </div>,
          )}
          {step(
            "colors",
            3,
            t.stepColors,
            <span className="inline-flex items-center gap-2"><ColorDots colors={sum.colors} />{sum.colorsLabel}</span>,
            <div className="flex flex-col"><PalettePicker />{nextBtn("colors")}</div>,
            { bad: sum.inksOver },
          )}
          {step(
            "quote",
            4,
            t.stepQuote,
            null,
            <div className="flex flex-col gap-5">
              <p className="text-sm text-slate-600">{t.quoteHint}</p>
              <DesignSummary onEdit={goTo} />
              <div className="sm:hidden">
                <ExportButtons />
              </div>
              {quote}
            </div>,
            { anchor: QUOTE_ANCHOR },
          )}
        </div>
        {open !== "quote" && (
          <div className={`hidden ${card} p-4 lg:flex lg:flex-col lg:gap-3`}>
            <div className="flex min-w-0 flex-col gap-1" aria-label={t.summaryTitle} role="group">
              <p className="flex min-w-0 items-center justify-between gap-3 text-sm">
                <span className={`truncate font-semibold tabular-nums ${sum.lengthOk ? "text-slate-900" : "text-red-700"}`}>{sum.size}</span>
                <span className={`flex shrink-0 items-center gap-2 text-xs ${sum.inksOver ? "font-medium text-red-700" : "text-slate-600"}`}><ColorDots colors={sum.colors} />{sum.colorsLabel}</span>
              </p>
              <p className="truncate text-xs text-slate-600">{sum.content}</p>
            </div>
            <button type="button" onClick={() => goTo("quote")} className={`${btnPrimary} w-full`}>
              {t.getQuote}
            </button>
          </div>
        )}
      </div>

      <MobileActionBar onView3d={show3d} onQuote={() => goTo("quote")} />
      <InkLimitDialog contact={contact} onContactForm={() => goTo("quote")} onChangeLogo={changeLogo} />
    </div>
  );
}

type StepProps = {
  id: StepId;
  n: number;
  title: string;
  summary: ReactNode;
  bad?: boolean;
  anchor?: string;
  open: boolean;
  onToggle: () => void;
  sectionRef: (el: HTMLElement | null) => void;
  children: ReactNode;
};

function Step({ id, n, title, summary, bad, anchor, open, onToggle, sectionRef, children }: StepProps) {
  const t = getDictionary().designer;
  const headId = `step-${id}-head`;
  const panelId = `step-${id}-panel`;
  return (
    <section
      id={anchor}
      ref={sectionRef}
      className={`${card} scroll-mt-36 overflow-hidden transition-shadow duration-200 motion-reduce:transition-none lg:scroll-mt-4 ${open ? "shadow-md shadow-slate-900/5" : ""}`}
    >
      <h2>
        <button
          id={headId}
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={onToggle}
          className="flex min-h-16 w-full cursor-pointer items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-slate-900 sm:px-5"
        >
          <span
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold tabular-nums ${
              open ? "bg-vt-red-deep text-white" : "bg-slate-100 text-slate-700"
            }`}
          >
            <span className="sr-only">{format(t.stepNumber, { n })}</span>
            <span aria-hidden="true">{n}</span>
          </span>
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="text-base font-semibold text-slate-900">{title}</span>
            {!open && summary && (
              <span className={`truncate text-sm ${bad ? "font-medium text-red-700" : "text-slate-600"}`}>{summary}</span>
            )}
          </span>
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className={`shrink-0 text-slate-500 transition-transform duration-200 motion-reduce:transition-none ${open ? "rotate-180" : ""}`}
            aria-hidden="true"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>
      </h2>
      <div id={panelId} role="region" aria-labelledby={headId} hidden={!open} className="border-t border-slate-100 px-4 pt-5 pb-5 sm:px-5">
        {children}
      </div>
    </section>
  );
}
