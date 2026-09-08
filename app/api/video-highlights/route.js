export const runtime = 'nodejs';
export const maxDuration = 60;

// AI Highlights — owner-only. This is not a public tool: Find Highlights
// and Scene/Chapter Detection were explicitly suspended from the public
// roadmap, then approved for the site owner's own personal use only. The
// single gate is the same signed 'convertam_owner' cookie /api/owner-login
// already sets — every request here is rejected before touching Gemini
// unless that cookie is present and valid, regardless of who's asking.
import { callGemini, AIError, CATEGORY_MESSAGES } from '@/lib/geminiClient';
import { isOwnerRequest } from '@/lib/usageCookie';
import { buildHighlightsPrompt, HIGHLIGHTS_SCHEMA, normalizeHighlightsResult } from '@/lib/media/highlightsSchema';

const MAX_SEGMENTS = 2000; // a transcript this long already means a very long video; keep the prompt bounded

export async function POST(request) {
  if (!isOwnerRequest(request.headers.get('cookie'))) {
    return Response.json({ error: 'Not available.' }, { status: 404 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return Response.json({ error: 'This feature is not configured yet. (Missing GEMINI_API_KEY on the server.)' }, { status: 500 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const { segments, duration } = body;

    if (!Array.isArray(segments) || segments.length === 0) {
      return Response.json({ error: 'No transcript segments received. Generate captions first, then try again.' }, { status: 400 });
    }
    const cleanSegments = segments
      .filter((s) => s && typeof s.text === 'string' && Number.isFinite(s.start) && Number.isFinite(s.end))
      .slice(0, MAX_SEGMENTS);
    if (!cleanSegments.length) {
      return Response.json({ error: 'The transcript has no usable segments.' }, { status: 400 });
    }
    const durationSeconds = Number.isFinite(duration) && duration > 0 ? duration : cleanSegments[cleanSegments.length - 1].end;

    const prompt = buildHighlightsPrompt(cleanSegments, durationSeconds);
    const { parsed } = await callGemini({
      apiKey,
      toolName: 'video-highlights',
      routeName: '/api/video-highlights',
      parts: [{ text: prompt }],
      schema: HIGHLIGHTS_SCHEMA,
      maxOutputTokens: 4096,
      temperature: 0.2,
      inputSizeApprox: prompt.length,
    });

    return Response.json(normalizeHighlightsResult(parsed, durationSeconds));
  } catch (err) {
    if (err instanceof AIError) {
      console.error(`Video highlights error [${err.requestId}] category=${err.category}:`, err.message);
      return Response.json({ error: CATEGORY_MESSAGES[err.category] || CATEGORY_MESSAGES.unexpected, requestId: err.requestId, category: err.category, retryAfterSeconds: err.retryAfterSeconds }, { status: 502 });
    }
    console.error('Video highlights error:', err);
    return Response.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
