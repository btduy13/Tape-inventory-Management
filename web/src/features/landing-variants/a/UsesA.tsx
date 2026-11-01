// Use cases: three illustrations that fill their panels, one line each.
import { CartonArt, CupArt, EcomArt } from "./art";
import { copyA as t } from "./copy";
import { wrap } from "./ui";

const ART = { carton: CartonArt, cup: CupArt, ecom: EcomArt } as const;

export function UsesA() {
  return (
    <section id="ung-dung" aria-labelledby="ung-dung-title" className="scroll-mt-4 bg-lp-mist text-lp-navy">
      <div className={`${wrap} py-12 md:py-16`}>
        <h2 id="ung-dung-title" className="lp-display text-4xl md:text-5xl">
          {t.usesTitle}
        </h2>
        <ul className="mt-6 grid gap-4 md:grid-cols-3">
          {t.uses.map((u) => {
            const Art = ART[u.key];
            return (
              <li key={u.key} className="overflow-hidden rounded-2xl bg-white">
                <div className="aspect-[22/15] bg-[linear-gradient(#fff,#f3f5fc)] px-2 pt-2">
                  <Art text={t.heroTapeText} />
                </div>
                <div className="border-t border-lp-navy/10 px-5 py-4">
                  <h3 className="lp-display text-xl">{u.title}</h3>
                  <p className="mt-1 text-[15px] leading-snug text-lp-navy/80">{u.body}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
