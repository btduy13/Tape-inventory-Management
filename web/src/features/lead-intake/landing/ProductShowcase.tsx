// Tape types shown as full-bleed strips at true relative width (48 / 60 / 72 mm),
// sliding in from alternate sides on scroll. Server Component.
import { getDictionary } from "@/i18n";
import { TapeSwatch, type TapeKind } from "./TapeSwatch";

export function ProductShowcase() {
  const t = getDictionary().landing;
  return (
    <section id="san-pham" aria-labelledby="san-pham-title" className="scroll-mt-4 overflow-hidden bg-lp-mist pt-28 pb-20 md:pt-40 md:pb-28">
      <div className="mx-auto grid max-w-[1600px] gap-6 px-4 sm:px-8 md:grid-cols-2 md:items-end">
        <h2 id="san-pham-title" className="lp-display text-5xl leading-[0.95] text-balance text-lp-ink sm:text-6xl lg:text-8xl">
          {t.productsTitle}
        </h2>
        <p className="max-w-lg text-lg leading-relaxed text-lp-ink/80 md:justify-self-end">{t.productsSubtitle}</p>
      </div>

      <ul className="mt-14 flex flex-col gap-12 md:mt-20 md:gap-16">
        {t.productTypes.map((p, i) => (
          <li key={p.key} className="flex flex-col gap-5">
            <TapeSwatch kind={p.key as TapeKind} label={t.heroTapeText} from={i % 2 ? "right" : "left"} />
            <div className="mx-auto grid w-full max-w-[1600px] gap-x-10 gap-y-2 px-4 sm:px-8 md:grid-cols-[12rem_minmax(0,22rem)_minmax(0,1fr)] md:items-baseline">
              <p className="lp-display text-5xl text-lp-cobalt md:text-6xl">
                {p.width}
                <span className="ml-1 text-2xl">{t.productWidthUnit}</span>
              </p>
              <h3 className="text-xl font-bold text-lp-ink">{p.title}</h3>
              <p className="max-w-xl leading-relaxed text-lp-ink/80">{p.body}</p>
            </div>
          </li>
        ))}
      </ul>

      <p className="mx-auto mt-14 max-w-[1600px] px-4 text-sm font-medium text-lp-ink/80 sm:px-8">{t.productSpecs}</p>
    </section>
  );
}
