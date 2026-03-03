import { URL } from 'node:url';
import { isIP } from 'node:net';
import dns from 'node:dns/promises';

/**
 * Validates that a webhook URL is safe to make requests to.
 * Blocks private/internal network addresses to prevent SSRF attacks.
 */

const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  'localhost.localdomain',
  'metadata.google.internal', // GCP metadata
  'kubernetes.default.svc', // Kubernetes
]);

/** Check if an IPv4 address belongs to a private/internal range. */
function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4) return false;

  const [a, b] = parts;

  // 10.0.0.0/8
  if (a === 10) return true;
  // 172.16.0.0/12
  if (a === 172 && b! >= 16 && b! <= 31) return true;
  // 192.168.0.0/16
  if (a === 192 && b === 168) return true;
  // 127.0.0.0/8 (loopback)
  if (a === 127) return true;
  // 169.254.0.0/16 (link-local / AWS metadata)
  if (a === 169 && b === 254) return true;
  // 0.0.0.0/8
  if (a === 0) return true;

  return false;
}

/** Check if an IPv6 address is loopback or link-local. */
function isPrivateIPv6(ip: string): boolean {
  const normalised = ip.toLowerCase();

  // ::1 loopback
  if (normalised === '::1' || normalised === '0000:0000:0000:0000:0000:0000:0000:0001') {
    return true;
  }
  // fe80::/10 link-local
  if (normalised.startsWith('fe80:')) return true;
  // fc00::/7 unique local
  if (normalised.startsWith('fc') || normalised.startsWith('fd')) return true;
  // ::ffff:127.0.0.1 (IPv4-mapped loopback)
  if (normalised.startsWith('::ffff:')) {
    const ipv4Part = normalised.slice(7);
    if (isIP(ipv4Part) === 4) return isPrivateIPv4(ipv4Part);
  }

  return false;
}

/** Check if a resolved IP address is private/internal. */
function isPrivateIP(ip: string): boolean {
  const version = isIP(ip);
  if (version === 4) return isPrivateIPv4(ip);
  if (version === 6) return isPrivateIPv6(ip);
  return false;
}

export interface UrlValidationResult {
  valid: boolean;
  reason?: string;
}

/**
 * Validate a webhook URL to prevent SSRF.
 *
 * Checks:
 * 1. Must be http or https
 * 2. Must not target a blocked hostname
 * 3. Resolved IP must not be in a private/internal range
 */
export async function validateWebhookUrl(url: string): Promise<UrlValidationResult> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { valid: false, reason: 'Invalid URL format' };
  }

  // Must be http(s)
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { valid: false, reason: 'URL must use http or https protocol' };
  }

  // Block known internal hostnames
  const hostname = parsed.hostname.toLowerCase();
  if (BLOCKED_HOSTNAMES.has(hostname)) {
    return { valid: false, reason: 'URL must not target internal hostnames' };
  }

  // If the hostname is already an IP, check it directly
  if (isIP(hostname)) {
    if (isPrivateIP(hostname)) {
      return { valid: false, reason: 'URL must not target private or internal IP addresses' };
    }
    return { valid: true };
  }

  // Resolve the hostname to IP addresses and check each one
  try {
    const addresses = await dns.resolve4(hostname).catch(() => [] as string[]);
    const addresses6 = await dns.resolve6(hostname).catch(() => [] as string[]);
    const allAddresses = [...addresses, ...addresses6];

    if (allAddresses.length === 0) {
      return { valid: false, reason: 'URL hostname could not be resolved' };
    }

    for (const addr of allAddresses) {
      if (isPrivateIP(addr)) {
        return { valid: false, reason: 'URL must not resolve to private or internal IP addresses' };
      }
    }
  } catch {
    return { valid: false, reason: 'URL hostname could not be resolved' };
  }

  return { valid: true };
}
