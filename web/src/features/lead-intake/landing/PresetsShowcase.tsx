// Active tape presets (public read). Server Component; renders even if the DB is down.
// Sits under ProductShowcase on the same mist background, as a ruled spec list.
import { format, getDictionary } from "@/i18n";
import type { ShowcasePreset } from "../server/presets";

/** Visual strip height bucket by tape width (Tailwind classes only: CSP has no inline styles). */
export function stripClass(widthMm: number): string {
  if (widthMm >= 70) return "h-10";
  if (widthMm >= 55) return "h-8";
  if (widthMm >= 45) return "h-6";
  return "h-4";
}

export function PresetsShowcase({ presets }: { presets: ShowcasePreset[] }) {
  const t = getDictionary().landing;
  return (
    <section aria-labelledby="kich-thuoc-title" className="bg-lp-mist pb-24 md:pb-32">
      <div className="mx-auto grid max-w-[1600px] gap-8 px-4 sm:px-8 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <div>
          <h2 id="kich-thuoc-title" className="lp-display text-3xl text-lp-ink sm:text-4xl">
            {t.presetsTitle}
          </h2>
          <p className="mt-3 max-w-sm leading-relaxed text-lp-ink/80">{t.presetsSubtitle}</p>
        </div>
        {presets.length === 0 ? (
          <p className="self-center text-lp-ink/70">{t.presetsEmpty}</p>
        ) : (
          <ul className="border-t-2 border-lp-ink">
            {presets.map((p) => (
              <li
                key={p.id}
                data-lp-reveal="up"
                className="grid grid-cols-[5rem_minmax(0,1fr)] items-center gap-x-5 gap-y-1 border-b border-lp-ink/20 py-4 sm:grid-cols-[7rem_minmax(0,1fr)_auto]"
              >
                <div aria-hidden="true" className="flex h-10 items-center">
                  <div className={`w-full rounded-[2px] bg-lp-tape ring-1 ring-lp-ink/15 ${stripClass(Number(p.width_mm))}`} />
                </div>
                <p className="font-bold text-lp-ink">{p.label}</p>
                <p className="col-start-2 text-sm text-lp-ink/75 sm:col-start-3">
                  {format(t.presetSpec, {
                    width: Number(p.width_mm),
                    length: Number(p.length_m),
                    thickness: Number(p.thickness_mic),
                  })}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
