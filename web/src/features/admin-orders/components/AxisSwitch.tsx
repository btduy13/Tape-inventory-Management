"use client";
// "Có trục mới" switch of printed tape (the app's Loại trục: Trục cũ / Trục mới). Order form and quote form.
import { ordersCopy as c } from "../lib/copy";

export function AxisSwitch({ checked, onChange }: { checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <div className="flex flex-col gap-1 sm:col-span-2 lg:col-span-3">
      <label className="inline-flex min-h-11 cursor-pointer items-center gap-3 self-start text-sm font-medium text-pt-text">
        <input type="checkbox" role="switch" checked={checked} className="peer sr-only" onChange={(e) => onChange(e.target.checked)} />
        <span
          aria-hidden
          className="relative h-6 w-11 shrink-0 rounded-full bg-pt-line-strong transition-colors after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-transform peer-checked:bg-vt-blue peer-checked:after:translate-x-5 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-vt-blue"
        />
        {c.axisSwitch}
      </label>
      <p className="text-xs text-pt-muted">{c.axisSwitchHint}</p>
    </div>
  );
}
