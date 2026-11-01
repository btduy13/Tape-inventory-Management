// Spec sheet: the 13 tape widths drawn to scale as printed swatches, plus a spec table.
import { TAPE_WIDTHS_MM, type TapeWidth, copyA as t } from "./copy";
import s from "./styles";
import { wrap } from "./ui";

// flex-grow proportional to width in mm -> swatches are to scale in any container.
// Literal class strings so Tailwind picks them up.
const GROW: Record<TapeWidth | 108, string> = {
  12: "grow-[12]",
  15: "grow-[15]",
  16: "grow-[16]",
  18: "grow-[18]",
  20: "grow-[20]",
  24: "grow-[24]",
  30: "grow-[30]",
  35: "grow-[35]",
  40: "grow-[40]",
  48: "grow-[48]",
  60: "grow-[60]",
  70: "grow-[70]",
  80: "grow-[80]",
  108: "grow-[108]",
};

function Swatch({ mm }: { mm: TapeWidth }) {
  const wide = mm >= 40;
  return (
    <li className={`flex min-w-0 basis-0 flex-col items-center gap-2 ${GROW[mm]}`}>
      <div className={`${s.strip} ${wide ? "" : s.dots} relative flex h-32 w-full items-center justify-center overflow-hidden md:h-44`}>
        {wide && (
          <span className="lp-display rotate-180 text-[13px] whitespace-nowrap text-lp-navy [writing-mode:vertical-rl] md:text-base">
            {t.heroTapeText}
          </span>
        )}
      </div>
      <span className="text-sm font-bold tabular-nums text-lp-navy md:text-base">{mm}</span>
    </li>
  );
}

const ROW_SMALL = TAPE_WIDTHS_MM.filter((w) => w < 40);
const ROW_LARGE = TAPE_WIDTHS_MM.filter((w) => w >= 40);

export function SpecsA() {
  return (
    <section id="quy-cach" aria-labelledby="quy-cach-title" className="scroll-mt-4 bg-white text-lp-navy">
      <div className={`${wrap} grid gap-8 py-12 md:py-16 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-12`}>
        <div className="min-w-0">
          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
            <h2 id="quy-cach-title" className="lp-display text-4xl md:text-5xl">
              {t.specsTitle}
            </h2>
            <p className="text-base font-semibold">{t.specsWidthLabel}</p>
          </div>
          <p className="sr-only">{t.specsWidthSr}</p>

          {/* md+: one row, to scale */}
          <ul aria-hidden="true" className="mt-6 hidden items-end gap-3 md:flex">
            {TAPE_WIDTHS_MM.map((mm) => (
              <Swatch key={mm} mm={mm} />
            ))}
          </ul>
          {/* small screens: two rows sharing one scale (spacer pads the shorter row) */}
          <div aria-hidden="true" className="mt-5 flex flex-col gap-4 md:hidden">
            <ul className="flex items-end gap-2">
              {ROW_SMALL.map((mm) => (
                <Swatch key={mm} mm={mm} />
              ))}
              <li className={`basis-0 ${GROW[108]}`} />
            </ul>
            {/* 4 gaps x 16px = 8 gaps x 8px in the row above, keeping the scale equal */}
            <ul className="flex items-end gap-4">
              {ROW_LARGE.map((mm) => (
                <Swatch key={mm} mm={mm} />
              ))}
            </ul>
          </div>
          <p className="mt-3 text-sm text-lp-navy/70">{t.specsWidthNote}</p>
        </div>

        <dl className="grid content-start self-start border-t-4 lg:mt-[4.5rem] border-lp-navy sm:grid-cols-2 lg:grid-cols-1">
          {t.specsRows.map((r) => (
            <div key={r.label} className="flex items-baseline justify-between gap-4 border-b border-lp-navy/20 py-3.5 sm:pr-6 lg:pr-0">
              <dt className="text-[15px] text-lp-navy/75">{r.label}</dt>
              <dd className="lp-display text-right text-xl">{r.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
