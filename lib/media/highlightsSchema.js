// Gemini prompt + schema for AI Highlights — an owner-only Video Editor
// feature (see app/api/video-highlights/route.js) that reads the CURRENT
// project's own transcript (the same one Auto Captions already produces
// locally, never a second upload) and asks a general-purpose text model to
// point out which moments are worth clipping out on their own, and where
// the video naturally breaks into chapters/scenes. This is text-only
// analysis of the transcript, not real audio/video scene analysis — pacing,
// visual cuts, and music changes are invisible to it, only what was said.

export function buildHighlightsPrompt(segments, durationSeconds) {
  const transcriptLines = segments.map((s) => `[${s.start.toFixed(1)}-${s.end.toFixed(1)}] ${s.text}`).join('\n');
  return `You are helping a video editor find the best moments to clip out of a longer recording, using only its transcript below. The full video is ${durationSeconds.toFixed(1)} seconds long.

Transcript (each line is [start-end in seconds] spoken text):
${transcriptLines}

Do two things:

1. highlights: identify up to 8 short, self-contained moments genuinely worth clipping out as their own standalone piece (a strong quote, a punchline, a key insight, a surprising or emotionally striking statement, a clear answer to an implied question). Each highlight's start/end MUST come from the actual segment timestamps above — never invent a time that isn't covered by the transcript. A highlight should be long enough to make sense on its own (a few seconds at minimum) but not so long it stops being a "highlight." Skip filler, small talk, or setup that doesn't stand alone. If nothing genuinely stands out, return fewer highlights (or none) rather than padding the list.

2. chapters: identify natural topic-change points across the whole video — where the conversation/content moves on to a clearly different subject. Each chapter is a single timestamp (the moment the new topic begins, from the transcript above) plus a short title for that section. Order chapters chronologically, starting near 0. Return fewer chapters for a short or single-topic video rather than forcing artificial breaks.

For every highlight and chapter, base your judgment ONLY on what the transcript actually says — never fabricate content or timestamps not grounded in it.`;
}

export const HIGHLIGHTS_SCHEMA = {
  type: 'OBJECT',
  properties: {
    highlights: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          start: { type: 'NUMBER' },
          end: { type: 'NUMBER' },
          title: { type: 'STRING' },
          reason: { type: 'STRING' },
        },
        required: ['start', 'end', 'title', 'reason'],
      },
    },
    chapters: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          time: { type: 'NUMBER' },
          title: { type: 'STRING' },
        },
        required: ['time', 'title'],
      },
    },
  },
  required: ['highlights', 'chapters'],
};

// Defensive normalization — never trusts the model's raw response shape
// blindly, same posture as lib/media/transcript.js's normalizeTranscript.
// Clamps every timestamp into [0, durationSeconds] and drops anything that
// comes out degenerate after clamping, rather than letting a bad AI
// response silently create an invalid highlight/chapter in the UI.
export function normalizeHighlightsResult(raw, durationSeconds) {
  const clamp = (n) => Math.max(0, Math.min(durationSeconds, Number(n) || 0));
  const highlights = Array.isArray(raw?.highlights)
    ? raw.highlights
        .map((h) => ({ start: clamp(h.start), end: clamp(h.end), title: String(h.title || '').trim(), reason: String(h.reason || '').trim() }))
        .filter((h) => h.end > h.start && h.title)
        .sort((a, b) => a.start - b.start)
    : [];
  const chapters = Array.isArray(raw?.chapters)
    ? raw.chapters
        .map((c) => ({ time: clamp(c.time), title: String(c.title || '').trim() }))
        .filter((c) => c.title)
        .sort((a, b) => a.time - b.time)
    : [];
  return { highlights, chapters };
}
