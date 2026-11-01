// Where the tape goes (carton, milk-tea cup seal, e-commerce parcels), why it pays off,
// and who it suits. Royal-blue band (vt-blue, derived from the logo navy). Server Component.
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
    <section id="ung-dung" aria-labelledby="ung-dung-title" className={`scroll-mt-24 bg-vt-blue text-white ${LP_SECTION_Y}`}>
      <div className={LP_CONTAINER}>
        <div className="flex max-w-4xl flex-col gap-5">
          <h2 id="ung-dung-title" className={LP_H2}>
            {t.useTitle}
          </h2>
          <p className="max-w-xl text-lg leading-relaxed text-white/80">{t.useSubtitle}</p>
        </div>

        <ul className="mt-12 grid gap-10 md:mt-16 md:grid-cols-3 md:gap-6">
          {t.useScenes.map((s, i) => (
            <li key={s.key} data-lp-reveal="up" className={`flex flex-col gap-5 ${i ? `lp-delay-${i}` : ""}`}>
              <div className="aspect-[372/318] overflow-hidden rounded-[2rem] bg-vt-blue-soft p-3 ring-1 ring-white/10 sm:p-4">{art[s.key as keyof typeof art]}</div>
              <div>
                <h3 className="lp-display text-2xl">{s.title}</h3>
                <p className="mt-1 max-w-sm leading-relaxed text-white/75">{s.body}</p>
              </div>
            </li>
          ))}
        </ul>

        <div className="mt-20 grid gap-10 border-t border-white/15 pt-14 md:mt-24 md:pt-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
          <div>
            <h2 className="lp-display text-3xl sm:text-4xl">{t.whyTitle}</h2>
            <h3 className="mt-8 text-sm font-semibold text-white/70">{t.useCasesTitle}</h3>
            <ul className="mt-3 grid gap-2 text-base font-medium">
              {t.useCases.map((u) => (
                <li key={u} className="flex items-baseline gap-3">
                  <span aria-hidden="true" className="h-0.5 w-4 shrink-0 -translate-y-1 bg-vt-yellow" />
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
