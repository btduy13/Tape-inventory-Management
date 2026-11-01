"use client";
// Labeled input / textarea with inline error (accessible: aria-invalid + aria-describedby).
import type { ChangeEvent } from "react";

type Props = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  hint?: string;
  required?: boolean;
  type?: "text" | "tel" | "email";
  inputMode?: "text" | "tel" | "email" | "numeric";
  autoComplete?: string;
  placeholder?: string;
  maxLength?: number;
  multiline?: boolean;
};

export function FormField(p: Props) {
  const describedBy = [p.error ? `${p.id}-error` : null, p.hint ? `${p.id}-hint` : null]
    .filter(Boolean)
    .join(" ") || undefined;
  const common = {
    id: p.id,
    name: p.id,
    value: p.value,
    required: p.required,
    placeholder: p.placeholder,
    maxLength: p.maxLength,
    "aria-invalid": p.error ? true : undefined,
    "aria-describedby": describedBy,
    className:
      "min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base text-slate-900 placeholder:text-slate-400 transition-colors duration-150 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/15 aria-[invalid=true]:border-red-600 motion-reduce:transition-none",
    onChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => p.onChange(e.target.value),
  };
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={p.id} className="text-sm font-medium text-slate-800">
        {p.label}
        {p.required && <span aria-hidden className="text-red-700"> *</span>}
      </label>
      {p.multiline ? (
        <textarea {...common} rows={3} />
      ) : (
        <input {...common} type={p.type ?? "text"} inputMode={p.inputMode} autoComplete={p.autoComplete} />
      )}
      {p.hint && !p.error && (
        <p id={`${p.id}-hint`} className="text-xs text-slate-600">{p.hint}</p>
      )}
      {p.error && (
        <p id={`${p.id}-error`} className="text-xs font-medium text-red-700">{p.error}</p>
      )}
    </div>
  );
}
