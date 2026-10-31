"use client";
// Provides one DesignStore per designer page. Wrap designer, mockup and lead form in it.
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { normalizePresets, type PresetOption } from "../lib/presets";
import { createDesignStore, type DesignStore } from "../lib/store";

type Ctx = { store: DesignStore; presets: PresetOption[] };

const DesignContext = createContext<Ctx | null>(null);

export function DesignProvider({ presets, children }: { presets: PresetOption[]; children: ReactNode }) {
  const [value] = useState<Ctx>(() => {
    const list = normalizePresets(presets);
    return { store: createDesignStore(list[0]), presets: list };
  });
  useEffect(() => () => value.store.destroy(), [value]);
  return <DesignContext.Provider value={value}>{children}</DesignContext.Provider>;
}

export function useDesignContext(): Ctx {
  const ctx = useContext(DesignContext);
  if (!ctx) throw new Error("useDesignContext must be used inside <DesignProvider>");
  return ctx;
}
