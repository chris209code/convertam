// Signed, HttpOnly-cookie-based state for the free-usage policy and owner
// testing mode. No database exists, so this cookie itself IS the source of
// truth — but it's cryptographically signed with a server-only secret, so
// its contents can't be forged or edited by the client. This is explicitly
// a Version 1 limitation, not a security claim: without accounts or a
// persistent server-side datastore, a determined visitor can reset their
// allowance by clearing cookies or switching browser/device. That's
// acceptable for V1, but this is never claimed to uniquely identify a human
// being — only to track one browser's usage on one device, in good faith.

import crypto from 'crypto';

function sign(payloadStr, secret) {
  return crypto.createHmac('sha256', secret).update(payloadStr).digest('base64url');
}

export function encodeSignedCookie(payload, secret) {
  const payloadStr = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = sign(payloadStr, secret);
  return `${payloadStr}.${signature}`;
}

export function decodeSignedCookie(token, secret) {
  if (!token || typeof token !== 'string' || !token.includes('.')) return null;
  const [payloadStr, signature] = token.split('.');
  if (!payloadStr || !signature) return null;
  const expected = sign(payloadStr, secret);
  // Constant-time comparison — a plain === here would leak timing
  // information about how many leading characters matched, which is a real
  // (if minor) side-channel for an attacker trying to forge a signature.
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    return JSON.parse(Buffer.from(payloadStr, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
}

// "Today" per the Africa/Lagos calendar day, computed server-side — the
// visitor's device clock/timezone is never trusted for this.
export function currentWATDateString() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Lagos', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}

// Milliseconds until the next Africa/Lagos midnight, for showing an
// accurate "resets at" time without trusting the client's own clock.
export function msUntilNextWATMidnight() {
  const now = new Date();
  const watNowStr = new Intl.DateTimeFormat('en-US', { timeZone: 'Africa/Lagos', hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(now);
  const [h, m, s] = watNowStr.split(':').map(Number);
  const secondsSinceWATMidnight = h * 3600 + m * 60 + s;
  return (24 * 3600 - secondsSinceWATMidnight) * 1000;
}

export function parseCookies(cookieHeader) {
  const out = {};
  if (!cookieHeader) return out;
  cookieHeader.split(';').forEach((pair) => {
    const idx = pair.indexOf('=');
    if (idx === -1) return;
    const key = pair.slice(0, idx).trim();
    const val = pair.slice(idx + 1).trim();
    if (key) out[key] = decodeURIComponent(val);
  });
  return out;
}

export function buildCookieHeader(name, value, { maxAgeSeconds, httpOnly = true, sameSite = 'Lax' } = {}) {
  const parts = [`${name}=${encodeURIComponent(value)}`, 'Path=/'];
  if (httpOnly) parts.push('HttpOnly');
  parts.push(`SameSite=${sameSite}`);
  if (process.env.NODE_ENV === 'production') parts.push('Secure');
  if (maxAgeSeconds != null) parts.push(`Max-Age=${maxAgeSeconds}`);
  return parts.join('; ');
}
