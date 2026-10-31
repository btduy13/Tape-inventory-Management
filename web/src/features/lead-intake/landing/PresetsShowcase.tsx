// Active tape presets (public read). Server Component; renders even if the DB is down.
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
    <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
      <h2 className="text-3xl font-bold tracking-tight text-stone-900">{t.presetsTitle}</h2>
      <p className="mt-2 text-stone-600">{t.presetsSubtitle}</p>
      {presets.length === 0 ? (
        <p className="mt-8 text-stone-500">{t.presetsEmpty}</p>
      ) : (
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {presets.map((p) => (
            <li key={p.id} className="flex flex-col gap-3 rounded-xl border border-stone-200 p-5">
              <div className="flex h-10 items-center">
                <div className={`w-full rounded-sm bg-amber-500 ${stripClass(Number(p.width_mm))}`} />
              </div>
              <p className="font-semibold text-stone-900">{p.label}</p>
              <p className="text-sm text-stone-600">
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
    </section>
  );
}
