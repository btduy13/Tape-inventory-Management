// Absolute links for emails (relative links do not work in mail clients).

export function absoluteUrl(siteUrl: string, path: string): string {
  return new URL(path, siteUrl.endsWith("/") ? siteUrl : `${siteUrl}/`).toString();
}
