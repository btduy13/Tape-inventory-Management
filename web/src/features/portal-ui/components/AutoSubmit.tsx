"use client";
// Progressive enhancement for GET filter forms:
// - selects / dates / checkboxes submit on change (text search submits on Enter),
// - empty fields are left out of the URL (`?status=` noise).
// Without JS the form still works through its submit button.
import { useEffect, useRef } from "react";

export function AutoSubmit() {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const form = ref.current?.closest("form");
    if (!form) return;
    const onChange = (e: Event) => {
      const el = e.target;
      if (el instanceof HTMLSelectElement || (el instanceof HTMLInputElement && (el.type === "date" || el.type === "checkbox"))) {
        form.requestSubmit();
      }
    };
    const onFormData = (e: FormDataEvent) => {
      for (const [k, v] of [...e.formData.entries()]) if (v === "") e.formData.delete(k);
    };
    form.addEventListener("change", onChange);
    form.addEventListener("formdata", onFormData);
    return () => {
      form.removeEventListener("change", onChange);
      form.removeEventListener("formdata", onFormData);
    };
  }, []);
  return <span ref={ref} hidden />;
}
