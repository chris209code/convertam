// Rate limiting for /api/media-transcribe — the one operation in the Media
// Workspace that costs real money per call (a Gemini request). Reuses the
// exact Redis-with-graceful-fallback pattern already established in
// lib/paymentIdempotency.js (same env vars, same "degrade to per-instance
// in-memory rather than hard-fail" posture) rather than inventing a second
// store convention.

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
function memIncr(key, windowSeconds) {
  const now = Date.now();
  const entry = memoryStore.get(key);
  if (!entry || entry.expiresAt < now) {
    memoryStore.set(key, { count: 1, expiresAt: now + windowSeconds * 1000 });
    return 1;
  }
  entry.count += 1;
  return entry.count;
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

const WINDOW_SECONDS = 60 * 60; // 1 hour
const MAX_TRANSCRIPTIONS_PER_WINDOW = 20;

// Returns { allowed, remaining }. `identifier` is typically a request IP —
// callers should fall back to a coarse identifier (e.g. 'unknown') rather
// than skip the check entirely when no IP is available, so the limiter still
// protects against the worst-case "many requests, no distinguishable client"
// scenario even though it's less precise per-user in that case.
export async function checkTranscribeRateLimit(identifier) {
  const key = `media-transcribe-rl:${identifier}`;
  let count;
  if (HAS_REAL_STORE) {
    const redis = getRedis();
    count = await redis.incr(key);
    if (count === 1) await redis.expire(key, WINDOW_SECONDS);
  } else {
    warnOnce();
    count = memIncr(key, WINDOW_SECONDS);
  }
  return { allowed: count <= MAX_TRANSCRIPTIONS_PER_WINDOW, remaining: Math.max(0, MAX_TRANSCRIPTIONS_PER_WINDOW - count) };
}
