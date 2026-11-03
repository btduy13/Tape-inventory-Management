// Single source of truth for app routes. Features import these instead of hard-coding paths.

export const ROUTES = {
  home: "/",
  design: "/thiet-ke",
  terms: "/dieu-khoan",
  quoteView: (token: string) => `/q/${encodeURIComponent(token)}`,
  login: "/login",
  authCallback: "/auth/callback",
  portal: "/portal",
  portalLead: (id: string) => `/portal/leads/${id}`,
  workshop: "/portal/xuong",
  workshopJob: (id: string) => `/portal/xuong/${id}`,
  /** Printable delivery note (A5 + QR) of a production job. */
  workshopDeliveryNote: (id: string) => `/portal/xuong/${id}/phieu-giao`,
  /** Public delivery confirmation opened from the delivery note QR (no login). */
  deliveryConfirm: (token: string) => `/giao/${encodeURIComponent(token)}`,
  admin: "/admin",
  adminUsers: "/admin/users",
  adminPresets: "/admin/presets",
  /** Tape widths + length range for the designer (0022). */
  adminTapeSpecs: "/admin/quy-cach",
  adminLead: (id: string) => `/admin/leads/${id}`,
  adminOrders: "/admin/don-hang",
  adminOrderNew: "/admin/don-hang/moi",
  adminOrder: (id: string) => `/admin/don-hang/${encodeURIComponent(id)}`,
  api: {
    leads: "/api/leads",
    quoteRespond: (token: string) => `/api/q/${encodeURIComponent(token)}/respond`,
    deliveryConfirm: (token: string) => `/api/giao/${encodeURIComponent(token)}`,
  },
} as const;

/** Path prefixes that require a logged-in internal user (checked optimistically in proxy). */
export const PROTECTED_PREFIXES = ["/portal", "/admin"] as const;

export function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}
