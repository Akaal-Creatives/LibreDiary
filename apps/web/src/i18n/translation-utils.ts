export interface TranslationStats {
  locale: string;
  name: string;
  nativeName: string;
  totalKeys: number;
  translatedKeys: number;
  missingKeys: string[];
  percentage: number;
  status: 'complete' | 'partial' | 'skeleton';
}

/**
 * Flattens a nested object into an array of dot-notation keys.
 */
export function flattenKeys(obj: Record<string, unknown>, prefix = ''): string[] {
  const keys: string[] = [];

  for (const key of Object.keys(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    const value = obj[key];

    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      keys.push(...flattenKeys(value as Record<string, unknown>, fullKey));
    } else {
      keys.push(fullKey);
    }
  }

  return keys;
}

/**
 * Computes translation statistics for a locale against the master key list.
 */
export function computeTranslationStats(
  masterKeys: string[],
  localeMessages: Record<string, unknown>,
  code: string,
  meta: { name: string; nativeName: string; dir: 'ltr' | 'rtl' }
): TranslationStats {
  if (masterKeys.length === 0) {
    return {
      locale: code,
      name: meta.name,
      nativeName: meta.nativeName,
      totalKeys: 0,
      translatedKeys: 0,
      missingKeys: [],
      percentage: 100,
      status: 'complete',
    };
  }

  const translatedKeySet = new Set(flattenKeys(localeMessages));
  const missingKeys = masterKeys.filter((key) => !translatedKeySet.has(key));
  const translatedKeys = masterKeys.length - missingKeys.length;
  const percentage = Math.round((translatedKeys / masterKeys.length) * 100);

  let status: 'complete' | 'partial' | 'skeleton';
  if (percentage === 100) {
    status = 'complete';
  } else if (percentage > 0) {
    status = 'partial';
  } else {
    status = 'skeleton';
  }

  return {
    locale: code,
    name: meta.name,
    nativeName: meta.nativeName,
    totalKeys: masterKeys.length,
    translatedKeys,
    missingKeys,
    percentage,
    status,
  };
}
