// Form field primitives: label + control + hint + error, wired with ids for screen readers.
import { useId } from "react";
import { checkboxClass, inputClass, textareaClass } from "./styles";

type FieldProps = {
  label: string;
  /** Short help under the control. */
  hint?: string;
  /** Validation message (renders role=alert and marks the control invalid). */
  error?: string | null;
  required?: boolean;
  className?: string;
  /** Receives the ids to put on the control. */
  children: (ids: { id: string; describedBy: string | undefined; invalid: boolean }) => React.ReactNode;
};

export function Field({ label, hint, error, required, className = "", children }: FieldProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errId = error ? `${id}-err` : undefined;
  const describedBy = [hintId, errId].filter(Boolean).join(" ") || undefined;
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label htmlFor={id} className="text-sm font-medium text-pt-text">
        {label}
        {required && <span className="text-pt-red-ink" aria-hidden> *</span>}
      </label>
      {children({ id, describedBy, invalid: !!error })}
      {hint && <p id={hintId} className="text-xs text-pt-muted">{hint}</p>}
      {error && <p id={errId} role="alert" className="text-xs font-medium text-pt-red-ink">{error}</p>}
    </div>
  );
}

type InputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "id"> & Omit<FieldProps, "children">;

export function TextField({ label, hint, error, required, className, ...input }: InputProps) {
  return (
    <Field label={label} hint={hint} error={error} required={required} className={className}>
      {({ id, describedBy, invalid }) => (
        <input id={id} aria-describedby={describedBy} aria-invalid={invalid || undefined} required={required} className={inputClass} {...input} />
      )}
    </Field>
  );
}

type SelectProps = Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "id"> &
  Omit<FieldProps, "children"> & { options: readonly { value: string; label: string }[]; placeholder?: string };

export function SelectField({ label, hint, error, required, className, options, placeholder, ...select }: SelectProps) {
  return (
    <Field label={label} hint={hint} error={error} required={required} className={className}>
      {({ id, describedBy, invalid }) => (
        <select id={id} aria-describedby={describedBy} aria-invalid={invalid || undefined} required={required} className={inputClass} {...select}>
          {placeholder !== undefined && <option value="">{placeholder}</option>}
          {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      )}
    </Field>
  );
}

type TextareaProps = Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "id"> & Omit<FieldProps, "children">;

export function TextareaField({ label, hint, error, required, className, ...area }: TextareaProps) {
  return (
    <Field label={label} hint={hint} error={error} required={required} className={className}>
      {({ id, describedBy, invalid }) => (
        <textarea id={id} aria-describedby={describedBy} aria-invalid={invalid || undefined} required={required} className={textareaClass} {...area} />
      )}
    </Field>
  );
}

type CheckboxProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "className"> & { label: string };

/** Checkbox with the whole label as a 44px hit area. */
export function CheckboxField({ label, ...input }: CheckboxProps) {
  return (
    <label className="inline-flex min-h-11 cursor-pointer items-center gap-2.5 text-sm text-pt-text">
      <input type="checkbox" className={checkboxClass} {...input} />
      {label}
    </label>
  );
}
