// Product types (clear / opaque / multi-colour printed tape). Server Component.
import { getDictionary } from "@/i18n";
import { TapeSwatch, type TapeKind } from "./TapeSwatch";

export function ProductShowcase() {
  const t = getDictionary().landing;
  return (
    <section aria-labelledby="san-pham-title" className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 md:py-20">
      <div className="max-w-2xl">
        <h2 id="san-pham-title" className="text-3xl font-extrabold tracking-tight text-stone-900 sm:text-4xl">
          {t.productsTitle}
        </h2>
        <p className="mt-3 leading-relaxed text-stone-700">{t.productsSubtitle}</p>
      </div>
      <ul className="mt-10 grid gap-x-8 gap-y-10 md:grid-cols-3">
        {t.productTypes.map((p) => (
          <li key={p.key} className="flex min-w-0 flex-col gap-4">
            <TapeSwatch kind={p.key as TapeKind} label={t.heroTapeText} />
            <h3 className="text-lg font-bold text-stone-900">{p.title}</h3>
            <p className="-mt-2 leading-relaxed text-stone-700">{p.body}</p>
          </li>
        ))}
      </ul>
      <p className="mt-10 border-t border-stone-200 pt-5 text-sm font-medium text-stone-700">{t.productSpecs}</p>
    </section>
  );
}
