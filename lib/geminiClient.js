// Shared Gemini client for every AI route on Convertam. This exists so a
// reliability fix only ever needs to happen once, in one place — the
// pre-existing pattern of each route re-implementing its own fetch/retry
// logic is exactly what let two routes (resume-ai, ask-solve-ai) miss the
// fix that had already been applied everywhere else.

function sleep(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }
function jitter(base) { return base + Math.random() * base * 0.4; }

export class AIError extends Error {
  constructor(category, requestId, detail) {
    super(detail || category);
    this.category = category;
    this.requestId = requestId;
  }
}

// User-facing messages, one per category — never a stack trace, never a raw
// API error, always something a non-technical person can act on.
export const CATEGORY_MESSAGES = {
  transient: 'The AI service is temporarily busy. We retried automatically but could not complete the request. Please try again shortly.',
  rate_limit: 'The AI service has reached its current usage limit. Please wait briefly and try again.',
  timeout: 'This took longer than expected. Try again, or with a smaller file if the issue continues.',
  invalid_file: 'We could not read this file. Confirm that it is a supported, non-corrupted file.',
  safety_block: 'This request could not be processed under the AI provider\'s safety rules.',
  unexpected: 'The AI returned an incomplete response. Please retry.',
  auth: 'This tool is not configured correctly on the server. Please contact support.',
  invalid_request: 'This request could not be processed as sent. Please check your input and try again.',
};

function classify(httpStatus) {
  if (httpStatus === 429) return 'rate_limit';
  if (httpStatus === 504) return 'timeout';
  if (httpStatus >= 500) return 'transient';
  if (httpStatus === 401 || httpStatus === 403) return 'auth';
  if (httpStatus === 400) return 'invalid_request';
  return 'unexpected';
}
function isRetryableCategory(category) {
  return category === 'rate_limit' || category === 'transient' || category === 'timeout' || category === 'unexpected';
}

function generateRequestId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

// Structured, privacy-safe logging — metadata only, never prompt content,
// never file content, never API keys.
function logAttempt(fields) {
  console.log(JSON.stringify({ scope: 'gemini_call', ...fields }));
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
  const maxAttempts = 3;
  // Attempt 1: immediate. Attempt 2: ~1s + jitter. Attempt 3: ~2.5s + jitter.
  const baseDelays = [0, 1000, 2500];

  const body = {
    contents: [{ role: 'user', parts }],
    generationConfig: schema
      ? { responseMimeType: 'application/json', responseSchema: schema, maxOutputTokens: maxOutputTokens || 8192 }
      : { maxOutputTokens: maxOutputTokens || 2048 },
  };

  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    if (attempt > 1) await sleep(jitter(baseDelays[attempt - 1]));
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
      // fetch itself threw — connection reset, DNS failure, etc.
      logAttempt({ requestId, toolName, routeName, model, attempt, maxAttempts, success: false, durationMs: Date.now() - start, note: `network_error: ${networkErr.message}`, inputSizeApprox, hasImage });
      lastError = new AIError('transient', requestId, networkErr.message);
      if (attempt < maxAttempts) continue;
      throw lastError;
    }

    const durationMs = Date.now() - start;

    if (!res.ok) {
      const geminiErrorCode = data?.error?.status || data?.error?.code;
      const geminiErrorMessage = data?.error?.message;
      const category = classify(res.status);
      logAttempt({ requestId, toolName, routeName, model, httpStatus: res.status, geminiErrorCode, geminiErrorMessage, attempt, maxAttempts, durationMs, success: false, inputSizeApprox, hasImage });

      lastError = new AIError(category, requestId, geminiErrorMessage);
      if (isRetryableCategory(category) && attempt < maxAttempts) {
        // Respect Retry-After if Gemini/Google's edge provides one
        const retryAfter = res.headers.get('retry-after');
        if (retryAfter && !isNaN(Number(retryAfter))) await sleep(Number(retryAfter) * 1000);
        continue;
      }
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
      if (attempt < maxAttempts) continue;
      throw lastError;
    }

    if (!schema) {
      logAttempt({ requestId, toolName, routeName, model, finishReason, attempt, maxAttempts, durationMs, success: true, inputSizeApprox, hasImage });
      return { raw, parsed: null, requestId };
    }

    try {
      const clean = raw.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(clean);
      logAttempt({ requestId, toolName, routeName, model, finishReason, attempt, maxAttempts, durationMs, success: true, inputSizeApprox, hasImage });
      return { raw, parsed, requestId };
    } catch {
      logAttempt({ requestId, toolName, routeName, model, finishReason, attempt, maxAttempts, durationMs, success: false, note: 'json_parse_failed', inputSizeApprox, hasImage });
      lastError = new AIError('unexpected', requestId, 'JSON parse failed');
      if (attempt < maxAttempts) continue;
      throw lastError;
    }
  }
  throw lastError;
}
