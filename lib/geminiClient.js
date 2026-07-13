// Shared Gemini client for every AI route on Convertam. This exists so a
// reliability fix only ever needs to happen once, in one place.
//
// This version implements the rate-limit stabilization fix: 429s are no
// longer treated as one generic retryable bucket. A 429 with a provider-
// supplied retry delay is genuinely different from a 429 with none (the
// latter usually means a longer-term quota exhaustion, not a momentary
// blip) — retrying blindly against an exhausted quota only adds more
// pressure to it. A lightweight per-instance circuit breaker also stops
// sending new requests for a short window after repeated 429s, since a
// server that just told us "too many requests" three times in a row isn't
// going to say something different on request four.

function sleep(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }
function jitter(base) { return base + Math.random() * base * 0.3; }

export class AIError extends Error {
  constructor(category, requestId, detail, retryAfterSeconds) {
    super(detail || category);
    this.category = category;
    this.requestId = requestId;
    this.retryAfterSeconds = retryAfterSeconds ?? null;
  }
}

// User-facing messages, one per category — never a stack trace, never a raw
// API error, always something a non-technical person can act on.
export const CATEGORY_MESSAGES = {
  transient: 'The AI service is temporarily busy. We retried automatically but could not complete the request. Please try again shortly.',
  rate_limit: 'The AI service is temporarily rate-limited. Please wait a moment and try again.',
  quota_exhausted: 'The AI service has reached its current usage limit for now. Please wait before trying again.',
  timeout: 'This took longer than expected. Try again, or with a smaller file if the issue continues.',
  invalid_file: 'We could not read this file. Confirm that it is a supported, non-corrupted file.',
  safety_block: 'This request could not be processed under the AI provider\'s safety rules.',
  unexpected: 'The AI returned an incomplete response. Please retry.',
  auth: 'This tool is not configured correctly on the server. Please contact support.',
  invalid_request: 'This request could not be processed as sent. Please check your input and try again.',
};

function generateRequestId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

// Structured, privacy-safe logging — metadata only, never prompt content,
// never file content, never API keys.
function logAttempt(fields) {
  console.log(JSON.stringify({ scope: 'gemini_call', ...fields }));
}

// Pulls the provider-specified retry delay out of a 429's error body, if
// present. Gemini returns this as a RetryInfo detail with a string like
// "30s". A 429 WITHOUT this detail is treated as a longer-term quota
// exhaustion, not a short rate limit — those are genuinely different
// situations and are handled differently below.
function extractRetryDelaySeconds(errorBody) {
  const details = errorBody?.error?.details;
  if (!Array.isArray(details)) return null;
  const retryInfo = details.find((d) => d['@type']?.includes('RetryInfo'));
  const raw = retryInfo?.retryDelay;
  if (!raw) return null;
  const match = String(raw).match(/^(\d+(\.\d+)?)s?$/);
  return match ? parseFloat(match[1]) : null;
}

// Lightweight per-instance circuit breaker. Serverless functions don't
// reliably share memory across invocations/instances, so this is
// deliberately scoped as "the safest practical per-instance protection"
// rather than a true distributed breaker — it still helps on warm
// instances handling back-to-back requests, which is exactly the pattern
// that was compounding quota pressure during heavy testing.
const circuitState = { recent429Timestamps: [] };
const CIRCUIT_WINDOW_MS = 30000;
const CIRCUIT_THRESHOLD = 3;

function recordRateLimitHit() {
  const now = Date.now();
  circuitState.recent429Timestamps.push(now);
  circuitState.recent429Timestamps = circuitState.recent429Timestamps.filter((t) => now - t < CIRCUIT_WINDOW_MS);
}
function isCircuitOpen() {
  const now = Date.now();
  circuitState.recent429Timestamps = circuitState.recent429Timestamps.filter((t) => now - t < CIRCUIT_WINDOW_MS);
  return circuitState.recent429Timestamps.length >= CIRCUIT_THRESHOLD;
}

/**
 * callGemini — the one shared entry point every route should use.
 *
 * @param {object} opts
 * @param {string} opts.apiKey
 * @param {string} opts.toolName - e.g. 'resume-ai', for logging only
 * @param {string} opts.routeName - e.g. '/api/resume-ai', for logging only
 * @param {Array} opts.parts - Gemini `parts` array (text/inline_data)
 * @param {object} [opts.schema] - responseSchema; omit for plain-text output
 * @param {number} [opts.maxOutputTokens]
 * @param {number} [opts.inputSizeApprox] - approximate char count, for logging only
 * @param {boolean} [opts.hasImage] - for logging only
 * @returns {Promise<{raw: string, parsed: object|null, requestId: string}>}
 */
export async function callGemini({ apiKey, toolName, routeName, parts, schema, maxOutputTokens, inputSizeApprox, hasImage }) {
  const requestId = generateRequestId();
  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

  if (isCircuitOpen()) {
    logAttempt({ requestId, toolName, routeName, model, attempt: 0, intendedGeminiCalls: 1, actualGeminiAttempts: 0, success: false, note: 'circuit_open_short_circuited', inputSizeApprox, hasImage });
    throw new AIError('quota_exhausted', requestId, 'Circuit breaker open — recent repeated rate limits', 20);
  }

  const body = {
    contents: [{ role: 'user', parts }],
    generationConfig: schema
      ? { responseMimeType: 'application/json', responseSchema: schema, maxOutputTokens: maxOutputTokens || 8192 }
      : { maxOutputTokens: maxOutputTokens || 2048 },
  };

  // Non-429 retryable failures (503, network blips, empty/malformed
  // response) still get one bounded retry — but no more. Three attempts
  // per action was itself part of what compounded quota pressure.
  const maxAttempts = 2;
  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const start = Date.now();
    let res, data;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify(body),
      });
      data = await res.json().catch(() => null);
    } catch (networkErr) {
      logAttempt({ requestId, toolName, routeName, model, attempt, maxAttempts, intendedGeminiCalls: 1, actualGeminiAttempts: attempt, success: false, durationMs: Date.now() - start, note: `network_error: ${networkErr.message}`, inputSizeApprox, hasImage });
      lastError = new AIError('transient', requestId, networkErr.message);
      if (attempt < maxAttempts) { await sleep(jitter(1000)); continue; }
      throw lastError;
    }

    const durationMs = Date.now() - start;

    if (!res.ok) {
      const geminiErrorCode = data?.error?.status || data?.error?.code;
      const geminiErrorMessage = data?.error?.message;

      if (res.status === 429) {
        recordRateLimitHit();
        const retryDelaySeconds = extractRetryDelaySeconds(data);

        if (retryDelaySeconds != null) {
          // A genuine short-term rate limit with a provider-specified wait.
          // Exactly ONE retry, waiting the provider's own duration — never
          // three rapid attempts against the same limit.
          logAttempt({ requestId, toolName, routeName, model, httpStatus: 429, geminiErrorCode, retryDelaySeconds, attempt, maxAttempts, durationMs, success: false, note: 'rate_limit_with_delay', inputSizeApprox, hasImage });
          if (attempt === 1) {
            await sleep(jitter(retryDelaySeconds * 1000));
            continue;
          }
          throw new AIError('rate_limit', requestId, geminiErrorMessage, retryDelaySeconds);
        } else {
          // No retry delay supplied — treated as longer-term quota
          // exhaustion, not a momentary blip. Do not retry at all; retrying
          // blindly here only adds more pressure to an already-exhausted
          // quota, which was the actual problem.
          logAttempt({ requestId, toolName, routeName, model, httpStatus: 429, geminiErrorCode, attempt, maxAttempts, durationMs, success: false, note: 'quota_exhausted_no_delay', inputSizeApprox, hasImage });
          throw new AIError('quota_exhausted', requestId, geminiErrorMessage, 60);
        }
      }

      const category = res.status === 504 ? 'timeout' : res.status >= 500 ? 'transient' : res.status === 401 || res.status === 403 ? 'auth' : res.status === 400 ? 'invalid_request' : 'unexpected';
      const retryable = category === 'transient' || category === 'timeout';
      logAttempt({ requestId, toolName, routeName, model, httpStatus: res.status, geminiErrorCode, geminiErrorMessage, attempt, maxAttempts, durationMs, success: false, inputSizeApprox, hasImage });

      lastError = new AIError(category, requestId, geminiErrorMessage);
      if (retryable && attempt < maxAttempts) { await sleep(jitter(1000)); continue; }
      throw lastError;
    }

    const candidate = data?.candidates?.[0];
    const finishReason = candidate?.finishReason;

    if (finishReason === 'SAFETY' || finishReason === 'RECITATION') {
      logAttempt({ requestId, toolName, routeName, model, finishReason, attempt, maxAttempts, durationMs, success: false, inputSizeApprox, hasImage });
      throw new AIError('safety_block', requestId);
    }

    const raw = candidate?.content?.parts?.[0]?.text;
    if (!raw) {
      logAttempt({ requestId, toolName, routeName, model, finishReason, attempt, maxAttempts, durationMs, success: false, note: 'empty_candidate', inputSizeApprox, hasImage });
      lastError = new AIError('unexpected', requestId);
      if (attempt < maxAttempts) { await sleep(jitter(1000)); continue; }
      throw lastError;
    }

    if (!schema) {
      logAttempt({ requestId, toolName, routeName, model, finishReason, attempt, maxAttempts, intendedGeminiCalls: 1, actualGeminiAttempts: attempt, success: true, inputSizeApprox, hasImage });
      return { raw, parsed: null, requestId, finishReason };
    }

    try {
      const clean = raw.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(clean);
      logAttempt({ requestId, toolName, routeName, model, finishReason, attempt, maxAttempts, intendedGeminiCalls: 1, actualGeminiAttempts: attempt, success: true, inputSizeApprox, hasImage });
      return { raw, parsed, requestId, finishReason };
    } catch {
      logAttempt({ requestId, toolName, routeName, model, finishReason, attempt, maxAttempts, durationMs, success: false, note: 'json_parse_failed', inputSizeApprox, hasImage });
      lastError = new AIError('unexpected', requestId, 'JSON parse failed');
      if (attempt < maxAttempts) { await sleep(jitter(1000)); continue; }
      throw lastError;
    }
  }
  throw lastError;
}
