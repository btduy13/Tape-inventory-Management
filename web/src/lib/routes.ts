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
  admin: "/admin",
  adminUsers: "/admin/users",
  adminPresets: "/admin/presets",
  /** Tape widths + length range for the designer (0022). */
  adminTapeSpecs: "/admin/quy-cach",
  adminLead: (id: string) => `/admin/leads/${id}`,
  api: {
    leads: "/api/leads",
    quoteRespond: (token: string) => `/api/q/${encodeURIComponent(token)}/respond`,
  },
} as const;

/** Path prefixes that require a logged-in internal user (checked optimistically in proxy). */
export const PROTECTED_PREFIXES = ["/portal", "/admin"] as const;

export function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}
