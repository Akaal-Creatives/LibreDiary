/**
 * Resolves a relative upload path (e.g. /uploads/orgId/file.png) to an
 * absolute URL using the API server origin. In same-origin deployments
 * this returns the path unchanged; in cross-origin deployments it
 * prefixes with the API domain.
 */
export function resolveUploadUrl(path: string | null | undefined): string {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) return path;

  const apiUrl = import.meta.env.VITE_API_URL || '/api/v1';

  try {
    const url = new URL(apiUrl, window.location.origin);

    // Same origin — return path as-is
    if (url.origin === window.location.origin) return path;

    // Cross-origin — prefix with API origin
    return `${url.origin}${path}`;
  } catch {
    return path;
  }
}
