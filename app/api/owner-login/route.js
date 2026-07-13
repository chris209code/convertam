export const runtime = 'nodejs';

import { encodeSignedCookie, decodeSignedCookie, parseCookies, buildCookieHeader } from '@/lib/usageCookie';

// Lightweight per-instance rate limiting for failed owner-login attempts.
// Like the Gemini circuit breaker, this is deliberately scoped as "the
// safest practical per-instance protection" rather than a true distributed
// rate limiter — serverless instances don't reliably share memory, but this
// still meaningfully slows down a brute-force attempt hitting a warm
// instance repeatedly.
const loginAttemptState = { recentFailures: [] };
const ATTEMPT_WINDOW_MS = 5 * 60 * 1000;
const MAX_FAILURES_IN_WINDOW = 5;

function isLoginRateLimited() {
  const now = Date.now();
  loginAttemptState.recentFailures = loginAttemptState.recentFailures.filter((t) => now - t < ATTEMPT_WINDOW_MS);
  return loginAttemptState.recentFailures.length >= MAX_FAILURES_IN_WINDOW;
}
function recordLoginFailure() {
  loginAttemptState.recentFailures.push(Date.now());
}

const OWNER_COOKIE_NAME = 'convertam_owner';
const OWNER_COOKIE_MAX_AGE = 60 * 60 * 12; // 12 hours — a sensible session length for a testing session, not indefinite

export async function POST(request) {
  const secret = process.env.CONVERTAM_OWNER_ACCESS_SECRET;
  const cookieSecret = process.env.CONVERTAM_OWNER_COOKIE_SECRET;
  if (!secret || !cookieSecret) {
    return Response.json({ error: 'Owner access is not configured on this deployment.' }, { status: 500 });
  }

  const body = await request.json().catch(() => ({}));
  const { action, password } = body;

  if (action === 'logout') {
    const headers = new Headers();
    headers.append('Set-Cookie', buildCookieHeader(OWNER_COOKIE_NAME, '', { maxAgeSeconds: 0 }));
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
  }

  // Default action: login
  if (isLoginRateLimited()) {
    return Response.json({ error: 'Too many failed attempts. Please wait a few minutes before trying again.' }, { status: 429 });
  }

  // Never log the entered password, under any circumstance, including on failure.
  if (typeof password !== 'string' || password.length === 0 || password !== secret) {
    recordLoginFailure();
    return Response.json({ error: 'Incorrect password.' }, { status: 401 });
  }

  const token = encodeSignedCookie({ owner: true, issuedAt: Date.now() }, cookieSecret);
  const headers = new Headers();
  headers.append('Set-Cookie', buildCookieHeader(OWNER_COOKIE_NAME, token, { maxAgeSeconds: OWNER_COOKIE_MAX_AGE, httpOnly: true, sameSite: 'Lax' }));
  return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
}

export async function GET(request) {
  // Lets the frontend check current owner status without re-submitting a password.
  const cookieSecret = process.env.CONVERTAM_OWNER_COOKIE_SECRET;
  const cookies = parseCookies(request.headers.get('cookie'));
  const token = cookies[OWNER_COOKIE_NAME];
  const payload = token && cookieSecret ? decodeSignedCookie(token, cookieSecret) : null;
  return Response.json({ isOwner: !!payload?.owner });
}
