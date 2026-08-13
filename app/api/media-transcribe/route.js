export const runtime = 'nodejs';
export const maxDuration = 60;

// The one server-side endpoint in the Media Workspace. Receives a small,
// pre-compressed WAV (client already downsampled to TRANSCRIBE_SAMPLE_RATE
// mono via lib/media/audioEncode.js before this is ever called — see
// limits.js's header comment for why that step is mandatory, not optional),
// re-validates duration/size server-side (never trust the client-only
// check), and calls Gemini through the shared callGemini wrapper. Nothing
// is ever written to disk — the buffer is base64-encoded in memory and
// discarded the moment this function returns.

import { callGemini, AIError, CATEGORY_MESSAGES } from '@/lib/geminiClient';
import { TRANSCRIBE_PROMPT, TRANSCRIBE_SCHEMA } from '@/lib/media/schema';
import { TRANSCRIBE_MAX_RAW_BYTES, validateTranscribeDuration } from '@/lib/media/limits';
import { checkTranscribeRateLimit } from '@/lib/media/rateLimit';

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
    const { allowed } = await checkTranscribeRateLimit(identifier);
    if (!allowed) {
      return Response.json({ error: 'You\'ve reached the transcription limit for now. Please try again in a bit.', category: 'rate_limit' }, { status: 429 });
    }

    const formData = await request.formData();
    const audio = formData.get('audio');
    const durationSeconds = parseFloat(formData.get('durationSeconds'));

    if (!audio) {
      return Response.json({ error: 'No audio received.' }, { status: 400 });
    }
    const durationError = validateTranscribeDuration(durationSeconds);
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
      maxOutputTokens: 8192,
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
