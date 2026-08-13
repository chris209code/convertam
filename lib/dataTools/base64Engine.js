// UTF-8-safe Base64 text encode/decode plus file<->Base64 helpers.
// Plain `btoa`/`atob` operate on UTF-16 code units, not bytes — calling
// btoa() directly on a string containing emoji or non-Latin1 characters
// throws "InvalidCharacterError". The standard fix (still the documented
// MDN approach) is to UTF-8-encode first via TextEncoder/TextDecoder, then
// base64 the resulting byte array — that's what encodeTextToBase64 /
// decodeBase64ToText do below, so Unicode, emoji, and any language's
// characters survive round-trip correctly.

export class Base64Error extends Error {}

export function encodeTextToBase64(text) {
  const bytes = new TextEncoder().encode(text);
  return bytesToBase64(bytes);
}

export function decodeBase64ToText(base64) {
  const bytes = decodeBase64ToBytes(base64);
  return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
}

export function bytesToBase64(bytes) {
  let binary = '';
  const chunkSize = 0x8000; // avoid call-stack blowup from String.fromCharCode(...hugeArray)
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

export function decodeBase64ToBytes(base64) {
  const cleaned = base64.trim().replace(/\s+/g, '');
  if (cleaned === '') throw new Base64Error('Input is empty.');
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(cleaned) || cleaned.length % 4 !== 0) {
    throw new Base64Error('This does not look like valid Base64 — check for missing characters, wrong padding ("="), or characters outside A–Z, a–z, 0–9, +, /.');
  }
  let binary;
  try {
    binary = atob(cleaned);
  } catch {
    throw new Base64Error('Could not decode this Base64 string — it may be truncated or corrupted.');
  }
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export async function fileToBase64(file) {
  const buf = await file.arrayBuffer();
  return bytesToBase64(new Uint8Array(buf));
}

export function base64ToBlob(base64, mimeType = 'application/octet-stream') {
  const bytes = decodeBase64ToBytes(base64);
  return new Blob([bytes], { type: mimeType });
}

// data: URI helpers — the standard way a decoded arbitrary file is offered
// back for download without guessing a specific extension.
export function base64ToDataUrl(base64, mimeType) {
  return `data:${mimeType};base64,${base64.trim().replace(/\s+/g, '')}`;
}

export function tryDecodeAsText(base64) {
  try {
    return { ok: true, text: decodeBase64ToText(base64) };
  } catch (e) {
    return { ok: false, error: e.message || 'Could not decode as text — this may be binary data. Try "Decode to file" instead.' };
  }
}
