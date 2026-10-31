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
      "w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-900 focus:border-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-200 aria-[invalid=true]:border-red-500",
    onChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => p.onChange(e.target.value),
  };
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={p.id} className="text-sm font-medium text-stone-800">
        {p.label}
        {p.required && <span aria-hidden className="text-red-600"> *</span>}
      </label>
      {p.multiline ? (
        <textarea {...common} rows={3} />
      ) : (
        <input {...common} type={p.type ?? "text"} inputMode={p.inputMode} autoComplete={p.autoComplete} />
      )}
      {p.hint && !p.error && (
        <p id={`${p.id}-hint`} className="text-xs text-stone-500">{p.hint}</p>
      )}
      {p.error && (
        <p id={`${p.id}-error`} className="text-sm text-red-600">{p.error}</p>
      )}
    </div>
  );
}
