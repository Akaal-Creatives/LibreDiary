export type EmbedProvider = 'youtube' | 'vimeo' | 'figma' | 'maps';

export function matchProvider(url: string): EmbedProvider | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  const { hostname, pathname } = parsed;
  if (hostname.includes('youtube.com') || hostname === 'youtu.be') return 'youtube';
  if (hostname.includes('vimeo.com')) return 'vimeo';
  if (
    hostname.includes('figma.com') &&
    (pathname.startsWith('/file') || pathname.startsWith('/proto'))
  )
    return 'figma';
  if (
    (hostname.includes('google.com') && pathname.startsWith('/maps')) ||
    hostname.includes('maps.google.com')
  )
    return 'maps';
  return null;
}

export function toEmbedUrl(url: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  const { hostname, pathname, searchParams } = parsed;

  // YouTube
  if (hostname.includes('youtube.com')) {
    const v = searchParams.get('v');
    if (v) return `https://www.youtube-nocookie.com/embed/${v}`;
    const embedMatch = pathname.match(/^\/embed\/([a-zA-Z0-9_-]+)/);
    if (embedMatch) return `https://www.youtube-nocookie.com/embed/${embedMatch[1]}`;
    const shortsMatch = pathname.match(/^\/shorts\/([a-zA-Z0-9_-]+)/);
    if (shortsMatch) return `https://www.youtube-nocookie.com/embed/${shortsMatch[1]}`;
  }
  if (hostname === 'youtu.be') {
    const id = pathname.slice(1).split('?')[0];
    if (id) return `https://www.youtube-nocookie.com/embed/${id}`;
  }

  // Vimeo
  if (hostname.includes('vimeo.com')) {
    const m = pathname.match(/^\/(\d+)/);
    if (m) return `https://player.vimeo.com/video/${m[1]}`;
  }

  // Figma
  if (
    hostname.includes('figma.com') &&
    (pathname.startsWith('/file') || pathname.startsWith('/proto'))
  ) {
    return `https://www.figma.com/embed?embed_host=librediary&url=${encodeURIComponent(url)}`;
  }

  // Google Maps
  if (
    (hostname.includes('google.com') && pathname.startsWith('/maps')) ||
    hostname.includes('maps.google.com')
  ) {
    if (pathname.includes('/embed')) return url;
    return `https://maps.google.com/maps?q=${encodeURIComponent(url)}&output=embed`;
  }

  return null;
}

export function getProviderLabel(provider: EmbedProvider): string {
  const labels: Record<EmbedProvider, string> = {
    youtube: 'YouTube',
    vimeo: 'Vimeo',
    figma: 'Figma',
    maps: 'Google Maps',
  };
  return labels[provider];
}
