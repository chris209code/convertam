// Rate limiting for /api/media-transcribe — the one operation in the Media
// Workspace that costs real money per call (a Gemini request). Reuses the
// exact Redis-with-graceful-fallback pattern already established in
// lib/paymentIdempotency.js (same env vars, same "degrade to per-instance
// in-memory rather than hard-fail" posture, same SET-NX-with-TTL idempotency
// technique) rather than inventing a second store convention.
//
// Two distinct budgets, on purpose — chunked transcription means one user
// click ("a transcription action") can fan out into several real Gemini
// calls ("chunk calls"), and those need separate limits:
//   - checkTranscribeActionLimit: how many times a user can click
//     Transcribe per hour, regardless of how long each file is.
//   - checkTranscribeChunkLimit: how many actual Gemini requests can happen
//     per hour, since that's what's actually billed and what the circuit
//     breaker in geminiClient.js is protecting.
// A single 15-minute transcription is 1 action and ~5 chunk calls — it
// must not simply consume 5 of a user's action budget the way a single
// undifferentiated counter would.

import { Redis } from '@upstash/redis';

const REST_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const REST_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const HAS_REAL_STORE = !!(REST_URL && REST_TOKEN);

let redisSingleton = null;
function getRedis() {
  if (!HAS_REAL_STORE) return null;
  if (!redisSingleton) redisSingleton = new Redis({ url: REST_URL, token: REST_TOKEN });
  return redisSingleton;
}

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
function memIncr(key, windowSeconds) {
  // Fixed window, matching the Redis path: the TTL is set once, on the
  // increment that creates the key, and left alone after that — repeated
  // increments must not keep pushing the window's expiry back out.
  const entry = memoryStore.get(key);
  if (!entry || (entry.expiresAt && entry.expiresAt < Date.now())) {
    const value = 1;
    memoryStore.set(key, { value, expiresAt: Date.now() + windowSeconds * 1000 });
    return value;
  }
  entry.value += 1;
  return entry.value;
}

let warned = false;
function warnOnce() {
  if (warned) return;
  warned = true;
  console.error(
    'Media transcription rate limiter has no configured Redis store (KV_REST_API_URL/TOKEN or ' +
    'UPSTASH_REDIS_REST_URL/TOKEN — see .env.local.example). Falling back to a per-instance ' +
    'in-memory limiter: still functional, but not shared across serverless instances.'
  );
}

const CHUNK_WINDOW_SECONDS = 60 * 60; // 1 hour
const MAX_CHUNK_CALLS_PER_WINDOW = 20;
const ACTION_WINDOW_SECONDS = 60 * 60; // 1 hour
const MAX_ACTIONS_PER_WINDOW = 10;

// One real Gemini request — called for EVERY chunk, including retries
// (a retried chunk really is a second Gemini call and should count as one).
// Returns { allowed, remaining }.
export async function checkTranscribeChunkLimit(identifier) {
  const key = `media-transcribe-chunk-rl:${identifier}`;
  let count;
  if (HAS_REAL_STORE) {
    const redis = getRedis();
    count = await redis.incr(key);
    if (count === 1) await redis.expire(key, CHUNK_WINDOW_SECONDS);
  } else {
    warnOnce();
    count = memIncr(key, CHUNK_WINDOW_SECONDS);
  }
  return { allowed: count <= MAX_CHUNK_CALLS_PER_WINDOW, remaining: Math.max(0, MAX_CHUNK_CALLS_PER_WINDOW - count) };
}

// One user-initiated Transcribe click. `actionId` is generated once
// client-side per click and sent on every chunk belonging to that action
// (see lib/media/providers/geminiTranscription.js) — this only increments
// the action counter the FIRST time a given (identifier, actionId) pair is
// seen, via a NX-guarded marker, so a network retry of chunk 0 (same
// actionId, same physical click) never double-counts as a second action.
// Returns { allowed, remaining }; remaining is null on a repeat call for an
// already-reserved actionId, since no new reservation was made.
export async function checkTranscribeActionLimit(identifier, actionId) {
  const seenKey = `media-transcribe-action-seen:${identifier}:${actionId}`;
  const countKey = `media-transcribe-action-rl:${identifier}`;

  let isFirstSeen;
  if (HAS_REAL_STORE) {
    const redis = getRedis();
    isFirstSeen = (await redis.set(seenKey, '1', { nx: true, ex: ACTION_WINDOW_SECONDS })) === 'OK';
  } else {
    warnOnce();
    isFirstSeen = memSetNx(seenKey, '1', ACTION_WINDOW_SECONDS);
  }

  if (!isFirstSeen) {
    // Already reserved for this exact action on an earlier attempt (a
    // retry of chunk 0) — the action was already allowed then, so it stays
    // allowed now without incrementing the counter a second time.
    return { allowed: true, remaining: null };
  }

  let count;
  if (HAS_REAL_STORE) {
    const redis = getRedis();
    count = await redis.incr(countKey);
    if (count === 1) await redis.expire(countKey, ACTION_WINDOW_SECONDS);
  } else {
    count = memIncr(countKey, ACTION_WINDOW_SECONDS);
  }
  return { allowed: count <= MAX_ACTIONS_PER_WINDOW, remaining: Math.max(0, MAX_ACTIONS_PER_WINDOW - count) };
}
