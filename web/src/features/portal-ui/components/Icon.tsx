// Inline stroke icons (no icon dependency). Decorative: always paired with visible text or an aria-label.
import type { IconName as NavIconName } from "../lib/nav";

export type IconName =
  | NavIconName
  | "menu" | "close" | "logout" | "search" | "sort" | "sortAsc" | "sortDesc"
  | "chevronLeft" | "chevronRight" | "check" | "alert" | "info" | "plus" | "calendar"
  | "truck" | "cash" | "mail" | "printer" | "pencil" | "paperclip" | "download" | "upload"
  | "fileDown" | "fileOut" | "trash" | "swap";

const PATHS: Record<IconName, string> = {
  overview: "M4 13h6V4H4zM14 20h6v-9h-6zM4 20h6v-4H4zM14 7h6V4h-6z",
  leads: "M16 19v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1M9.5 10a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7M21 19v-1a4 4 0 0 0-3-3.9M15.5 3.2a3.5 3.5 0 0 1 0 6.6",
  workshop: "M3 21V10l6 4V10l6 4V6l6-3v18zM7 17h2M12 17h2M17 17h2",
  customers: "M4 21V5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v16M9 8h6M9 12h6M9 16h3",
  users: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8M4 21a8 8 0 0 1 16 0",
  ruler: "M3 17 17 3l4 4L7 21zM7 13l2 2M10 10l2 2M13 7l2 2",
  layers: "m12 3 9 5-9 5-9-5zM3 13l9 5 9-5",
  quotes: "M6 3h9l4 4v14H6zM14 3v5h5M9 13h6M9 17h4",
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
  truck: "M3 6h11v10H3zM14 9h4l3 3v4h-7M7.5 19.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3M17.5 19.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3",
  cash: "M3 7h18v10H3zM12 14.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5M6.5 10v.01M17.5 14v.01",
  mail: "M3 6h18v12H3zM3 7l9 6 9-6",
  printer: "M7 9V3h10v6M7 17H4V9h16v8h-3M7 14h10v7H7z",
  pencil: "M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4",
  paperclip: "M20 11.5l-7.8 7.8a5 5 0 0 1-7.1-7.1l8.5-8.5a3.3 3.3 0 0 1 4.7 4.7l-8.5 8.5a1.7 1.7 0 0 1-2.4-2.4L15 6.9",
  download: "M12 4v11M7 10l5 5 5-5M5 20h14",
  upload: "M12 16V5M7 10l5-5 5 5M5 20h14",
  fileDown: "M6 3h9l4 4v14H6zM14 3v5h5M12 11v6M9.5 14.5 12 17l2.5-2.5",
  fileOut: "M6 3h9l4 4v14H6zM14 3v5h5M9 14h6M13 11.5l2.5 2.5-2.5 2.5",
  trash: "M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3",
  swap: "M4 8h13M14 5l3 3-3 3M20 16H7M10 13l-3 3 3 3",
};

export function Icon({ name, className = "size-5" }: { name: IconName; className?: string }) {
  return (
    <svg aria-hidden focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={`shrink-0 ${className}`}>
      <path d={PATHS[name]} />
    </svg>
  );
}
