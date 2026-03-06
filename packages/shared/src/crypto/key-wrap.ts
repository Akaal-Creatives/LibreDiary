/**
 * Key Wrapping — AES-256-KW (Key Wrap)
 *
 * Wraps workspace keys with the user's master key for secure storage.
 * The wrapped key can only be unwrapped with the correct master key.
 *
 * Developed by Akaal Creatives
 * https://www.akaalcreatives.com
 */

/** Convert Uint8Array to ArrayBuffer for Web Crypto API compatibility */
function toBuffer(data: Uint8Array): ArrayBuffer {
  return new Uint8Array(data).buffer as ArrayBuffer;
}

/**
 * Import a raw key for AES-KW operations.
 */
async function importWrappingKey(rawKey: Uint8Array): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', toBuffer(rawKey), { name: 'AES-KW' }, false, [
    'wrapKey',
    'unwrapKey',
  ]);
}

/**
 * Import a raw key as a CryptoKey that can be wrapped/unwrapped.
 */
async function importKeyToWrap(rawKey: Uint8Array): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', toBuffer(rawKey), { name: 'AES-GCM' }, true, [
    'encrypt',
    'decrypt',
  ]);
}

/**
 * Wrap a workspace key with a master key using AES-256-KW.
 *
 * @param keyToWrap - The workspace key to protect
 * @param wrappingKey - The master key used to wrap
 * @returns The wrapped key bytes (original key length + 8 bytes integrity check)
 */
export async function wrapKey(keyToWrap: Uint8Array, wrappingKey: Uint8Array): Promise<Uint8Array> {
  const wrapCryptoKey = await importWrappingKey(wrappingKey);
  const targetCryptoKey = await importKeyToWrap(keyToWrap);

  const wrappedBuffer = await crypto.subtle.wrapKey('raw', targetCryptoKey, wrapCryptoKey, {
    name: 'AES-KW',
  });

  return new Uint8Array(wrappedBuffer);
}

/**
 * Unwrap a workspace key using a master key.
 *
 * @param wrappedKey - The wrapped key bytes
 * @param wrappingKey - The master key used to unwrap
 * @returns The original workspace key
 * @throws If the wrapping key is wrong or the wrapped key is tampered
 */
export async function unwrapKey(
  wrappedKey: Uint8Array,
  wrappingKey: Uint8Array
): Promise<Uint8Array> {
  const wrapCryptoKey = await importWrappingKey(wrappingKey);

  const unwrappedCryptoKey = await crypto.subtle.unwrapKey(
    'raw',
    toBuffer(wrappedKey),
    wrapCryptoKey,
    { name: 'AES-KW' },
    { name: 'AES-GCM' },
    true,
    ['encrypt', 'decrypt']
  );

  const rawKey = await crypto.subtle.exportKey('raw', unwrappedCryptoKey);
  return new Uint8Array(rawKey);
}
