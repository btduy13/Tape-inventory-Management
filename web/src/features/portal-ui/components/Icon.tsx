// Inline stroke icons (no icon dependency). Decorative: always paired with visible text or an aria-label.
import type { IconName as NavIconName } from "../lib/nav";

export type IconName =
  | NavIconName
  | "menu" | "close" | "logout" | "search" | "sort" | "sortAsc" | "sortDesc"
  | "chevronLeft" | "chevronRight" | "check" | "alert" | "info" | "plus" | "calendar";

const PATHS: Record<IconName, string> = {
  overview: "M4 13h6V4H4zM14 20h6v-9h-6zM4 20h6v-4H4zM14 7h6V4h-6z",
  leads: "M16 19v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1M9.5 10a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7M21 19v-1a4 4 0 0 0-3-3.9M15.5 3.2a3.5 3.5 0 0 1 0 6.6",
  workshop: "M3 21V10l6 4V10l6 4V6l6-3v18zM7 17h2M12 17h2M17 17h2",
  users: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8M4 21a8 8 0 0 1 16 0",
  ruler: "M3 17 17 3l4 4L7 21zM7 13l2 2M10 10l2 2M13 7l2 2",
  layers: "m12 3 9 5-9 5-9-5zM3 13l9 5 9-5",
  menu: "M4 6h16M4 12h16M4 18h16",
  close: "M6 6l12 12M18 6 6 18",
  logout: "M15 4h4v16h-4M10 8l-4 4 4 4M6 12h11",
  search: "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14M20 20l-4-4",
  sort: "M8 9l4-4 4 4M8 15l4 4 4-4",
  sortAsc: "M8 11l4-4 4 4",
  sortDesc: "M8 13l4 4 4-4",
  chevronLeft: "M15 6l-6 6 6 6",
  chevronRight: "M9 6l6 6-6 6",
  check: "M5 12.5l4.5 4.5L19 7",
  alert: "M12 8v5M12 16.5v.5M10.3 3.9 2.6 17.5A2 2 0 0 0 4.3 20.5h15.4a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0",
  info: "M12 11v5M12 8v.5M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18",
  plus: "M12 5v14M5 12h14",
  calendar: "M4 6h16v14H4zM4 10h16M8 3v4M16 3v4",
};

export function Icon({ name, className = "size-5" }: { name: IconName; className?: string }) {
  return (
    <svg aria-hidden focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={`shrink-0 ${className}`}>
      <path d={PATHS[name]} />
    </svg>
  );
}
