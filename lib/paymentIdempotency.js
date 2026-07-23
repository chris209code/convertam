// Backend idempotency for paid CloudConvert conversions (OfficeConvertWorkspace's
// pay-per-conversion tools: pdf-to-word, word-to-pdf, pdf-to-excel,
// excel-to-pdf, pdf-to-powerpoint, powerpoint-to-pdf). Before this existed,
// a single successful Paystack payment could trigger an unlimited number
// of CloudConvert jobs — nothing tied "this payment reference" to "this
// job" anywhere, and the only thing stopping a second click was a client-
// side React state flag, which a refresh, a repeated fetch(), or a second
// browser tab doesn't go through at all.
//
// This makes /api/convert/start refuse to create a second CloudConvert job
// for a payment reference that's already produced (or is producing) one —
// enforced server-side, independent of anything the frontend does.
//
// Requires a real Redis-compatible store in production — Vercel's Redis
// Marketplace integration (Upstash under the hood) works out of the box;
// see .env.local.example for the exact env vars it needs. In development,
// when no store is configured, this falls back to an in-memory Map so the
// logic can be built and tested locally without provisioning Redis — that
// fallback is explicitly refused outside development (see
// requireStoreOrThrow below), so a misconfigured production deployment
// fails loudly on the first paid conversion instead of silently shipping
// with no protection at all.

import { Redis } from '@upstash/redis';

const REST_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const REST_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const HAS_REAL_STORE = !!(REST_URL && REST_TOKEN);
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

let redisSingleton = null;
function getRedis() {
  if (!HAS_REAL_STORE) return null;
  if (!redisSingleton) redisSingleton = new Redis({ url: REST_URL, token: REST_TOKEN });
  return redisSingleton;
}

// Dev-only in-memory fallback. Module-level, so it persists across
// requests within one `next dev` process — NOT safe for real serverless
// production (separate function instances don't share it, and a cold
// start wipes it), which is exactly why requireStoreOrThrow() below never
// allows it to be used when NODE_ENV === 'production'.
const memoryStore = new Map();
function memGet(key) {
  const entry = memoryStore.get(key);
  if (!entry) return null;
  if (entry.expiresAt && entry.expiresAt < Date.now()) { memoryStore.delete(key); return null; }
  return entry.value;
}
function memSet(key, value, exSeconds) {
  memoryStore.set(key, { value, expiresAt: exSeconds ? Date.now() + exSeconds * 1000 : null });
}
function memSetNx(key, value, exSeconds) {
  if (memGet(key) !== null) return false;
  memSet(key, value, exSeconds);
  return true;
}

function requireStoreOrThrow() {
  if (HAS_REAL_STORE) return getRedis();
  if (IS_PRODUCTION) {
    throw new Error(
      'Payment idempotency store is not configured. Set KV_REST_API_URL/KV_REST_API_TOKEN ' +
      '(or UPSTASH_REDIS_REST_URL/UPSTASH_REDIS_REST_TOKEN) — see .env.local.example.'
    );
  }
  return null; // dev fallback path — callers check for this and use memGet/memSet instead
}

const recordKey = (reference) => `payment:${reference}`;
const lockKey = (reference) => `payment:${reference}:lock`;
const RECORD_TTL_SECONDS = 60 * 60 * 24 * 7; // one week — comfortably covers any realistic replay window
const LOCK_TTL_SECONDS = 120; // generous cap on how long one conversion attempt can hold the claim

export async function getPaymentRecord(reference) {
  const store = requireStoreOrThrow();
  if (!store) return memGet(recordKey(reference));
  const value = await store.get(recordKey(reference));
  return value || null;
}

// Called right after Paystack verification succeeds. Creates the record
// only if one doesn't already exist — a replayed /api/payment/verify call
// for a reference that's already consumed/completed must never reset it
// back to "verified", which would re-open the door to a second job.
export async function ensurePaymentVerified(reference) {
  const store = requireStoreOrThrow();
  const fresh = { status: 'verified', jobId: null, result: null, createdAt: Date.now() };
  if (!store) {
    if (memGet(recordKey(reference)) === null) memSet(recordKey(reference), fresh, RECORD_TTL_SECONDS);
    return memGet(recordKey(reference));
  }
  await store.set(recordKey(reference), fresh, { nx: true, ex: RECORD_TTL_SECONDS });
  return store.get(recordKey(reference));
}

// Atomically claims the right to create a new CloudConvert job for this
// payment reference.
//
// Returns { claimed: true } when this call won the claim — the caller
// should proceed to create the CloudConvert job, then call
// recordJobCreated(). Returns { claimed: false, record } when the
// reference is unverified, already consumed (a job exists), or already
// completed — the caller must NOT create a new job, and should replay
// whatever `record` says instead (existing jobId to poll, or a completed
// result to return immediately).
export async function claimPaymentForNewJob(reference) {
  const store = requireStoreOrThrow();
  const rKey = recordKey(reference);
  const lKey = lockKey(reference);

  const record = store ? await store.get(rKey) : memGet(rKey);
  if (!record) return { claimed: false, record: null };
  if (record.status === 'completed' || record.status === 'consumed') return { claimed: false, record };

  // record.status === 'verified' — win the exclusive lock before creating
  // a job, so two near-simultaneous requests for the same reference
  // (double-click, a duplicate network retry, two tabs) can't both pass
  // this check and each create their own CloudConvert job.
  const gotLock = store
    ? (await store.set(lKey, '1', { nx: true, ex: LOCK_TTL_SECONDS })) === 'OK'
    : memSetNx(lKey, '1', LOCK_TTL_SECONDS);
  if (!gotLock) {
    // Someone else is claiming it right now. Re-read once — if they've
    // already written 'consumed'/'completed', replay that; if not (a very
    // tight race), fail safe and let the caller surface a "try again in a
    // moment" error rather than risk creating a duplicate job.
    const latest = store ? await store.get(rKey) : memGet(rKey);
    return { claimed: false, record: latest || record };
  }
  return { claimed: true, record };
}

export async function recordJobCreated(reference, jobId) {
  const store = requireStoreOrThrow();
  const patch = { status: 'consumed', jobId, result: null };
  if (!store) {
    const existing = memGet(recordKey(reference)) || {};
    memSet(recordKey(reference), { ...existing, ...patch }, RECORD_TTL_SECONDS);
    return;
  }
  const existing = (await store.get(recordKey(reference))) || {};
  await store.set(recordKey(reference), { ...existing, ...patch }, { ex: RECORD_TTL_SECONDS });
}

export async function recordJobCompleted(reference, jobId, result) {
  const store = requireStoreOrThrow();
  const patch = { status: 'completed', jobId, result, completedAt: Date.now() };
  if (!store) {
    const existing = memGet(recordKey(reference)) || {};
    memSet(recordKey(reference), { ...existing, ...patch }, RECORD_TTL_SECONDS);
    return;
  }
  const existing = (await store.get(recordKey(reference))) || {};
  await store.set(recordKey(reference), { ...existing, ...patch }, { ex: RECORD_TTL_SECONDS });
}
