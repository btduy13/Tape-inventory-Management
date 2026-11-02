import { format, getDictionary } from "@/i18n";

const t = getDictionary();

export function UnreadBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span
      aria-live="polite"
      className="inline-flex min-w-6 items-center justify-center rounded-full bg-pt-red-ink px-2 py-0.5 text-xs font-semibold text-white"
      title={format(t.orders.unreadCount, { count })}
    >
      {count > 99 ? "99+" : count}
      <span className="sr-only">{format(t.orders.unreadCount, { count })}</span>
    </span>
  );
}
