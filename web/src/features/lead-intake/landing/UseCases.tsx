// Where the tape goes (carton, milk-tea cup seal, e-commerce parcels), why it pays off,
// and who it suits. Navy band. Server Component.
import { getDictionary } from "@/i18n";
import { CartonTapeArt, CupSealArt, ParcelArt } from "./CartonTapeArt";

export function UseCases() {
  const t = getDictionary().landing;
  const art = {
    carton: <CartonTapeArt caption={t.heroArtCaption} tapeText={t.heroTapeText} />,
    cup: <CupSealArt tapeText={t.heroTapeText} />,
    ecom: <ParcelArt tapeText={t.heroTapeText} />,
  } as const;

  return (
    <section id="ung-dung" aria-labelledby="ung-dung-title" className="scroll-mt-4 bg-lp-navy pt-24 pb-24 text-white md:pt-32 md:pb-32">
      <div className="mx-auto max-w-[1600px] px-4 sm:px-8">
        <div className="grid gap-6 md:grid-cols-2 md:items-end">
          <h2 id="ung-dung-title" className="lp-display text-5xl leading-[0.95] text-balance sm:text-6xl lg:text-8xl">
            {t.useTitle}
          </h2>
          <p className="max-w-lg text-lg leading-relaxed text-white/80 md:justify-self-end">{t.useSubtitle}</p>
        </div>

        <ul className="mt-14 grid gap-10 md:mt-20 md:grid-cols-3 md:gap-6">
          {t.useScenes.map((s, i) => (
            <li key={s.key} data-lp-reveal="up" className={`flex flex-col gap-5 ${i ? `lp-delay-${i}` : ""}`}>
              <div className="overflow-hidden rounded-[2rem] bg-lp-cobalt p-6 sm:p-8">{art[s.key as keyof typeof art]}</div>
              <div className="px-1">
                <h3 className="lp-display text-2xl">{s.title}</h3>
                <p className="mt-1 max-w-sm leading-relaxed text-white/75">{s.body}</p>
              </div>
            </li>
          ))}
        </ul>

        <div className="mt-24 grid gap-10 md:mt-32 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
          <div>
            <h2 className="lp-display text-3xl sm:text-4xl">{t.whyTitle}</h2>
            <h3 className="mt-8 text-sm font-semibold text-white/70">{t.useCasesTitle}</h3>
            <ul className="mt-3 flex flex-wrap gap-2">
              {t.useCases.map((u) => (
                <li key={u} className="rounded-full border border-white/35 px-3 py-1.5 text-sm font-medium">
                  {u}
                </li>
              ))}
            </ul>
          </div>
          <ul className="grid gap-8 sm:grid-cols-3 sm:gap-6">
            {t.whyReasons.map((r) => (
              <li key={r.title} className="border-t-2 border-lp-tape pt-5">
                <h3 className="text-lg font-bold">{r.title}</h3>
                <p className="mt-2 leading-relaxed text-white/75">{r.body}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
