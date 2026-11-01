// Where the tape goes (carton, milk-tea cup seal, e-commerce parcels), why it pays off,
// and who it suits. Deep-navy band (the logo's navy). Server Component.
import { getDictionary } from "@/i18n";
import { CartonTapeArt, CupSealArt, ParcelArt } from "./CartonTapeArt";
import { LP_CONTAINER, LP_H2, LP_SECTION_Y } from "./ui";

export function UseCases() {
  const t = getDictionary().landing;
  const art = {
    carton: <CartonTapeArt caption={t.heroArtCaption} tapeText={t.heroTapeText} />,
    cup: <CupSealArt tapeText={t.heroTapeText} />,
    ecom: <ParcelArt tapeText={t.heroTapeText} />,
  } as const;

  return (
    <section id="ung-dung" aria-labelledby="ung-dung-title" className={`scroll-mt-20 bg-vt-navy-deep text-white ${LP_SECTION_Y}`}>
      <div className={LP_CONTAINER}>
        <div className="grid gap-5 md:grid-cols-2 md:items-end">
          <h2 id="ung-dung-title" className={LP_H2}>
            {t.useTitle}
          </h2>
          <p className="max-w-md text-lg leading-relaxed text-white/80 md:justify-self-end">{t.useSubtitle}</p>
        </div>

        <ul className="mt-12 grid gap-10 md:mt-16 md:grid-cols-3 md:gap-6">
          {t.useScenes.map((s, i) => (
            <li key={s.key} data-lp-reveal="up" className={`flex flex-col gap-5 ${i ? `lp-delay-${i}` : ""}`}>
              <div className="overflow-hidden rounded-[2rem] bg-vt-navy p-6 ring-1 ring-white/10 sm:p-8">{art[s.key as keyof typeof art]}</div>
              <div>
                <h3 className="lp-display text-2xl">{s.title}</h3>
                <p className="mt-1 max-w-sm leading-relaxed text-white/75">{s.body}</p>
              </div>
            </li>
          ))}
        </ul>

        <div className="mt-20 grid gap-10 border-t border-white/15 pt-14 md:mt-24 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] md:pt-16">
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
              <li key={r.title} className="border-t-2 border-vt-yellow pt-5">
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
