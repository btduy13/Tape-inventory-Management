"use client";
// One editable price line.
import { formatVnd } from "@/i18n";
import { vi } from "@/i18n/vi";
import { parseMoney, parseQty, type EditorLine } from "../lib/editor-state";
import { lineTotal } from "../lib/totals";

interface Props {
  line: EditorLine;
  disabled: boolean;
  canRemove: boolean;
  onChange: (patch: Partial<EditorLine>) => void;
  onRemove: () => void;
}

const input = "w-full rounded border border-zinc-300 px-2 py-1 disabled:bg-zinc-100";

export function QuoteLineRow({ line, disabled, canRemove, onChange, onRemove }: Props) {
  const t = vi.quotes;
  return (
    <tr className="border-b border-zinc-200 align-top">
      <td className="py-1 pr-2">
        <textarea
          aria-label={t.description}
          className={input}
          rows={2}
          maxLength={300}
          value={line.description}
          disabled={disabled}
          onChange={(e) => onChange({ description: e.target.value })}
        />
      </td>
      <td className="w-24 py-1 pr-2">
        <input
          aria-label={t.unit}
          className={input}
          maxLength={20}
          value={line.unit}
          disabled={disabled}
          onChange={(e) => onChange({ unit: e.target.value })}
        />
      </td>
      <td className="w-28 py-1 pr-2">
        <input
          aria-label={t.quantity}
          className={`${input} text-right`}
          inputMode="decimal"
          value={line.quantity}
          disabled={disabled}
          onChange={(e) => onChange({ quantity: e.target.value })}
        />
      </td>
      <td className="w-36 py-1 pr-2">
        <input
          aria-label={t.unitPrice}
          className={`${input} text-right`}
          inputMode="numeric"
          value={line.unitPrice}
          disabled={disabled}
          onChange={(e) => onChange({ unitPrice: e.target.value })}
        />
      </td>
      <td className="w-36 py-2 pr-2 text-right">
        {formatVnd(lineTotal(parseQty(line.quantity), parseMoney(line.unitPrice)))}
      </td>
      <td className="w-10 py-1">
        {!disabled && canRemove ? (
          <button type="button" className="text-red-600" aria-label={t.removeLine} onClick={onRemove}>
            ×
          </button>
        ) : null}
      </td>
    </tr>
  );
}
