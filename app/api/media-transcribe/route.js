export const runtime = 'nodejs';
export const maxDuration = 60;

// The one server-side endpoint in the Media Workspace. Receives a small,
// pre-compressed WAV — one chunk of a (possibly longer) file, already
// downsampled to TRANSCRIBE_SAMPLE_RATE mono and sliced to at most
// TRANSCRIBE_CHUNK_SECONDS client-side (see lib/media/audioEncode.js and
// lib/media/providers/geminiTranscription.js's chunking orchestration —
// limits.js's header comment explains why chunking exists at all),
// re-validates duration/size server-side for THIS chunk (never trust the
// client-only check), and calls Gemini through the shared callGemini
// wrapper. Nothing is ever written to disk — the buffer is base64-encoded
// in memory and discarded the moment this function returns.
//
// chunkIndex/totalChunks/actionId are small additive fields on top of the
// original single-request contract, not a new contract — every request
// still carries exactly one chunk's WAV and gets exactly one Gemini call;
// these three fields only tell the rate limiter which requests belong to
// the same user-initiated transcription action (see rateLimit.js).

import { callGemini, AIError, CATEGORY_MESSAGES } from '@/lib/geminiClient';
import { TRANSCRIBE_PROMPT, TRANSCRIBE_SCHEMA } from '@/lib/media/schema';
import { TRANSCRIBE_MAX_RAW_BYTES, validateTranscribeChunkDuration } from '@/lib/media/limits';
import { checkTranscribeActionLimit, checkTranscribeChunkLimit } from '@/lib/media/rateLimit';

function getClientIdentifier(request) {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return request.headers.get('x-real-ip') || 'unknown';
}

export async function POST(request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return Response.json({ error: 'Transcription is not configured on this server yet.', category: 'auth' }, { status: 500 });
  }

  try {
    const identifier = getClientIdentifier(request);

    const formData = await request.formData();
    const audio = formData.get('audio');
    const durationSeconds = parseFloat(formData.get('durationSeconds'));
    const chunkIndexRaw = formData.get('chunkIndex');
    const chunkIndex = chunkIndexRaw != null ? parseInt(chunkIndexRaw, 10) : 0;
    // Falls back to the client IP when actionId is missing (an old/
    // unexpected caller) rather than rejecting outright — every chunk from
    // that caller then shares one action identity, the same fail-safe
    // posture the original single-limiter code had.
    const actionId = formData.get('actionId') || identifier;

    // Chunk 0 both starts and reserves the action's slot in the 10/hour
    // action budget — every later chunk in the same action (index > 0)
    // only touches the chunk-call budget below. Checked before the
    // chunk-call budget so a rejected action never consumes a chunk-call
    // slot for a request that was never going to reach Gemini.
    if (chunkIndex === 0) {
      const { allowed: actionAllowed } = await checkTranscribeActionLimit(identifier, actionId);
      if (!actionAllowed) {
        return Response.json({ error: 'You\'ve reached the transcription limit for now (10 per hour). Please try again in a bit.', category: 'rate_limit' }, { status: 429 });
      }
    }

    const { allowed: chunkAllowed } = await checkTranscribeChunkLimit(identifier);
    if (!chunkAllowed) {
      return Response.json({ error: 'You\'ve made too many transcription requests in the last hour. Please wait a bit and try again.', category: 'rate_limit' }, { status: 429 });
    }

    if (!audio) {
      return Response.json({ error: 'No audio received.' }, { status: 400 });
    }
    const durationError = validateTranscribeChunkDuration(durationSeconds);
    if (durationError) {
      return Response.json({ error: durationError, category: 'invalid_request' }, { status: 400 });
    }
    if (audio.size > TRANSCRIBE_MAX_RAW_BYTES) {
      return Response.json({ error: `This audio is larger than expected for its reported duration. Please try a different file.`, category: 'invalid_request' }, { status: 400 });
    }

    const buf = Buffer.from(await audio.arrayBuffer());
    const base64 = buf.toString('base64');

    const parts = [
      { text: TRANSCRIBE_PROMPT },
      { inline_data: { mime_type: 'audio/wav', data: base64 } },
    ];

    const { parsed } = await callGemini({
      apiKey,
      toolName: 'media-transcribe',
      routeName: '/api/media-transcribe',
      parts,
      schema: TRANSCRIBE_SCHEMA,
      hasImage: false,
      inputSizeApprox: buf.length,
      // A 3-minute chunk of dense, exclamatory dialogue (short back-to-back
      // lines, each its own timestamped JSON segment) can genuinely need
      // more than 8192 tokens of structured output once per-segment field
      // overhead is counted — that's what silently truncated a real user's
      // transcript before geminiClient's finishReason==='MAX_TOKENS' check
      // existed to catch it. Gemini 2.5 Flash supports up to 65536 output
      // tokens; 32768 is a generous margin above any observed real chunk
      // without approaching that ceiling.
      maxOutputTokens: 32768,
      timeoutMs: 55000,
    });

    if (!parsed) {
      return Response.json({ error: CATEGORY_MESSAGES.unexpected, category: 'unexpected' }, { status: 502 });
    }

    return Response.json(parsed);
  } catch (err) {
    if (err instanceof AIError) {
      console.error(`Media transcribe AI error [${err.requestId}] category=${err.category}:`, err.message);
      return Response.json({ error: CATEGORY_MESSAGES[err.category] || CATEGORY_MESSAGES.unexpected, requestId: err.requestId, category: err.category, retryAfterSeconds: err.retryAfterSeconds }, { status: 502 });
    }
    console.error('Media transcribe error:', err);
    return Response.json({ error: 'Something went wrong while transcribing. Please try again.', category: 'unexpected' }, { status: 500 });
  }
}
