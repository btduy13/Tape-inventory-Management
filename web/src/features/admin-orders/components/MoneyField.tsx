"use client";
// Money input like the app's `currency-format` fields: text with "." thousands, reformatted on blur.
// The visible box has no name; a hidden input submits the plain number string the zod schema expects.
import { useState } from "react";
import { TextField } from "@/features/portal-ui/components/Field";
import { formatMoneyInput, moneyValue } from "../lib/form-money";

type Props = {
  name: string;
  label: string;
  /** Plain number string ("" = empty). */
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  error?: string | null;
  hint?: string;
};

export function MoneyField({ name, value, onChange, ...field }: Props) {
  // What is typed while the box has focus; null = show the formatted value.
  const [typing, setTyping] = useState<string | null>(null);
  return (
    <>
      <TextField
        {...field}
        inputMode="decimal"
        autoComplete="off"
        value={typing ?? formatMoneyInput(value)}
        onFocus={() => setTyping(formatMoneyInput(value))}
        onBlur={() => setTyping(null)}
        onChange={(e) => {
          setTyping(e.target.value);
          onChange(moneyValue(e.target.value));
        }}
      />
      <input type="hidden" name={name} value={value} />
    </>
  );
}
