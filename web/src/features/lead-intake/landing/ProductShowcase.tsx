// Tape types shown as full-bleed strips at true relative width (48 / 60 / 72 mm, labelled as a
// common width, not the only one),
// sliding in from alternate sides on scroll. Server Component.
import { getDictionary } from "@/i18n";
import { TapeSwatch, type TapeKind } from "./TapeSwatch";
import { LP_CONTAINER, LP_H2 } from "./ui";

export function ProductShowcase() {
  const t = getDictionary().landing;
  return (
    <section id="san-pham" aria-labelledby="san-pham-title" className="scroll-mt-20 overflow-hidden bg-vt-paper pt-28 pb-12 md:pt-36 md:pb-14">
      <div className={`${LP_CONTAINER} grid gap-5 md:grid-cols-2 md:items-end`}>
        <h2 id="san-pham-title" className={`${LP_H2} text-vt-ink`}>
          {t.productsTitle}
        </h2>
        <p className="max-w-md text-lg leading-relaxed text-vt-ink/80 md:justify-self-end">{t.productsSubtitle}</p>
      </div>

      <ul className="mt-12 flex flex-col gap-10 md:mt-16 md:gap-14">
        {t.productTypes.map((p, i) => (
          <li key={p.key} className="flex flex-col gap-5">
            <TapeSwatch kind={p.key as TapeKind} label={t.heroTapeText} from={i % 2 ? "right" : "left"} />
            <div className={`${LP_CONTAINER} grid gap-x-10 gap-y-1 md:grid-cols-[9rem_minmax(0,1fr)] md:items-start lg:grid-cols-[10rem_minmax(0,1fr)]`}>
              <p className="flex flex-col lp-display text-5xl text-vt-red-deep md:text-6xl">
                <span className="mb-1 font-sans text-xs font-bold tracking-wide text-vt-navy uppercase">{t.productWidthExample}</span>
                <span>
                  {p.width}
                  <span className="ml-1 text-2xl">{t.productWidthUnit}</span>
                </span>
              </p>
              <div className="flex max-w-[60ch] flex-col gap-1 md:pt-5">
                <h3 className="text-xl font-bold text-vt-ink">{p.title}</h3>
                <p className="leading-relaxed text-vt-ink/80">{p.body}</p>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <p className={`${LP_CONTAINER} mt-12 text-sm font-semibold text-vt-navy`}>{t.productSpecs}</p>
    </section>
  );
}
