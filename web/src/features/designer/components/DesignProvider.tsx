"use client";
// Provides one DesignStore per designer page. Wrap designer, mockup and lead form in it.
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { registerFontFamilies } from "../lib/fonts";
import { createDesignStore, type DesignStore } from "../lib/store";
import { DEFAULT_TAPE_SPEC, initialTapeSize, toTapeSpec, type TapeSpec } from "../lib/tape-spec";

type Ctx = { store: DesignStore; spec: TapeSpec };

const DesignContext = createContext<Ctx | null>(null);

/** `spec`: active widths + length range from the DB (getTapeSpec()); defaults when omitted.
 *  `fonts`: generated CSS font-family of each self-hosted web font (app/thiet-ke/fonts.ts). */
export function DesignProvider({ spec, fonts, children }: { spec?: TapeSpec; fonts?: Record<string, string>; children: ReactNode }) {
  const [value] = useState<Ctx>(() => {
    registerFontFamilies(fonts);
    const s = spec
      ? toTapeSpec({
          widths: spec.widths.map((w) => ({ width_mm: w })),
          settings: { min_length_m: spec.minLengthM, max_length_m: spec.maxLengthM, thickness_mic: spec.thicknessMic },
        })
      : DEFAULT_TAPE_SPEC;
    return { store: createDesignStore(initialTapeSize(s)), spec: s };
  });
  useEffect(() => () => value.store.destroy(), [value]);
  return <DesignContext.Provider value={value}>{children}</DesignContext.Provider>;
}

export function useDesignContext(): Ctx {
  const ctx = useContext(DesignContext);
  if (!ctx) throw new Error("useDesignContext must be used inside <DesignProvider>");
  return ctx;
}
