"use client";
// One editable price line.
import { formatVnd } from "@/i18n";
import { vi } from "@/i18n/vi";
import { parseMoney, parseQty, type EditorLine } from "../lib/editor-state";
import { lineTotal } from "../lib/totals";
import { Icon } from "@/features/portal-ui/components/Icon";
import { inputClass } from "@/features/portal-ui/components/styles";

interface Props {
  line: EditorLine;
  disabled: boolean;
  canRemove: boolean;
  onChange: (patch: Partial<EditorLine>) => void;
  onRemove: () => void;
}

const input = inputClass;

export function QuoteLineRow({ line, disabled, canRemove, onChange, onRemove }: Props) {
  const t = vi.quotes;
  return (
    <tr className="border-b border-pt-line align-top">
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
      <td className="w-36 py-3 pr-2 text-right font-medium tabular-nums">
        {formatVnd(lineTotal(parseQty(line.quantity), parseMoney(line.unitPrice)))}
      </td>
      <td className="w-12 py-1">
        {!disabled && canRemove ? (
          <button type="button" className="inline-flex size-11 items-center justify-center rounded-lg text-pt-red-ink hover:bg-pt-red-tint" aria-label={t.removeLine} onClick={onRemove}>
            <Icon name="close" className="size-4" />
          </button>
        ) : null}
      </td>
    </tr>
  );
}
