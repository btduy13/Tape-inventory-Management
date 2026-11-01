// Active tape presets (public read). Server Component; renders even if the DB is down.
// Sits under ProductShowcase on the same mist background, as a ruled spec list.
import { format, getDictionary } from "@/i18n";
import type { ShowcasePreset } from "../server/presets";
import { LP_CONTAINER } from "./ui";

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
    <section aria-labelledby="kich-thuoc-title" className="border-t border-vt-ink/10 bg-vt-paper pt-12 pb-20 md:pt-14 md:pb-28">
      <div className={`${LP_CONTAINER} grid gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]`}>
        <div>
          <h2 id="kich-thuoc-title" className="lp-display text-3xl text-vt-ink sm:text-4xl">
            {t.presetsTitle}
          </h2>
          <p className="mt-3 max-w-sm leading-relaxed text-vt-ink/80">{t.presetsSubtitle}</p>
        </div>
        {presets.length === 0 ? (
          <p className="self-center text-vt-ink/70">{t.presetsEmpty}</p>
        ) : (
          <ul className="lp-stagger border-t-2 border-vt-ink">
            {presets.map((p) => (
              <li
                key={p.id}
                data-lp-reveal="up"
                className="grid grid-cols-[5rem_minmax(0,1fr)] items-center gap-x-5 gap-y-1 border-b border-vt-ink/20 py-4 sm:grid-cols-[7rem_minmax(0,1fr)]"
              >
                <div aria-hidden="true" className="flex h-10 items-center">
                  {/* printed tape: the brand mark repeated along the strip */}
                  <div
                    className={`flex w-full items-center justify-around overflow-hidden rounded-[2px] bg-vt-yellow py-px ring-1 ring-vt-ink/15 ${stripClass(Number(p.width_mm))}`}
                  >
                    {[0, 1, 2].map((k) => (
                      // eslint-disable-next-line @next/next/no-img-element -- next/image adds an inline style (blocked by CSP)
                      <img key={k} src="/brand/vinh-thinh-icon.png" alt="" width={512} height={512} loading="lazy" className="h-full w-auto" />
                    ))}
                  </div>
                </div>
                <p className="font-bold text-vt-ink">
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
