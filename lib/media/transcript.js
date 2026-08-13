// Normalized transcript data model — the one shape every downstream
// consumer (transcript editor, caption engine, exporters) works against,
// regardless of which provider produced it. Per the spec: speaker and
// word-level timestamps are always optional and are never fabricated when
// a provider (in V1, always Gemini — see providers/geminiTranscription.js)
// doesn't actually supply them.
//
// Shape:
// { language, duration, segments: [{ id, start, end, text, speaker, words }] }
// - speaker: string | null — always null in V1 (Gemini's plain transcription
//   isn't a diarization model; asking it to guess speaker turns would mean
//   inventing data, which the spec explicitly forbids). The field exists
//   now so a real diarization provider can populate it later without a
//   schema change (see spec's "future-ready architecture").
// - words: array | null — always null in V1 for the same reason (word-level
//   timestamps need forced alignment, which a plain generateContent call
//   can't reliably produce without risking fabricated timings).

let idCounter = 0;
function nextId() { idCounter += 1; return `seg-${Date.now().toString(36)}-${idCounter}`; }

// Defensive normalization — never trusts a provider's raw response shape
// blindly. Drops malformed segments rather than crashing the UI on them.
// When raw.duration is present (always true for a chunked-and-merged
// transcript, where it's the client-measured total file duration — see
// providers/geminiTranscription.js — and also true for Gemini's own
// single-request response), every segment is clamped to end no later than
// that duration. This guards against a single-chunk Gemini response that
// mis-estimates its own end timestamp just as much as it guards a merged
// multi-chunk transcript.
export function normalizeTranscript(raw) {
  const totalDuration = Number.isFinite(raw?.duration) ? raw.duration : null;
  const segments = Array.isArray(raw?.segments)
    ? raw.segments
        .filter((s) => s && typeof s.text === 'string' && Number.isFinite(s.start) && Number.isFinite(s.end))
        .map((s) => {
          const start = totalDuration != null ? Math.min(Math.max(0, s.start), totalDuration) : Math.max(0, s.start);
          const end = totalDuration != null ? Math.min(Math.max(start, s.end), totalDuration) : Math.max(start, s.end);
          return {
            id: nextId(),
            start,
            end,
            text: s.text.trim(),
            speaker: typeof s.speaker === 'string' && s.speaker.trim() ? s.speaker.trim() : null,
            words: Array.isArray(s.words) && s.words.length ? s.words : null,
          };
        })
        .filter((s) => s.end > s.start) // drop segments clamping reduced to nothing
        .sort((a, b) => a.start - b.start)
    : [];

  return {
    language: typeof raw?.language === 'string' ? raw.language : null,
    duration: totalDuration ?? (segments.length ? segments[segments.length - 1].end : 0),
    segments,
  };
}

export function editSegmentText(transcript, segmentId, newText) {
  return {
    ...transcript,
    segments: transcript.segments.map((s) => (s.id === segmentId ? { ...s, text: newText, words: null } : s)),
  };
}

export function deleteSegment(transcript, segmentId) {
  return { ...transcript, segments: transcript.segments.filter((s) => s.id !== segmentId) };
}

// Merges segment B into segment A (A must come before B). Text is joined
// with a space; the resulting segment spans both segments' full time range.
// Word-level timestamps are dropped (they'd no longer correspond to
// anything real once the boundary is gone).
export function mergeSegments(transcript, segmentIdA, segmentIdB) {
  const idxA = transcript.segments.findIndex((s) => s.id === segmentIdA);
  const idxB = transcript.segments.findIndex((s) => s.id === segmentIdB);
  if (idxA === -1 || idxB === -1 || idxA === idxB) return transcript;
  const [first, second] = idxA < idxB ? [transcript.segments[idxA], transcript.segments[idxB]] : [transcript.segments[idxB], transcript.segments[idxA]];
  const merged = { ...first, end: second.end, text: `${first.text} ${second.text}`.trim(), words: null };
  const segments = transcript.segments.filter((s) => s.id !== segmentIdA && s.id !== segmentIdB);
  segments.splice(Math.min(idxA, idxB), 0, merged);
  return { ...transcript, segments };
}

// Splits a segment into two at a character offset within its text. The time
// range is divided proportionally by character count between the two
// halves — an approximation (real speech isn't evenly paced), same honesty
// posture as this codebase's other "intelligently approximate, not exact"
// timing code (see Write on PDF's fieldDetection.js for the established
// precedent of this exact tradeoff).
export function splitSegment(transcript, segmentId, charOffset) {
  const idx = transcript.segments.findIndex((s) => s.id === segmentId);
  if (idx === -1) return transcript;
  const seg = transcript.segments[idx];
  const clampedOffset = Math.max(1, Math.min(seg.text.length - 1, charOffset));
  const firstText = seg.text.slice(0, clampedOffset).trim();
  const secondText = seg.text.slice(clampedOffset).trim();
  if (!firstText || !secondText) return transcript;

  const ratio = clampedOffset / seg.text.length;
  const splitTime = seg.start + (seg.end - seg.start) * ratio;

  const firstSeg = { ...seg, end: splitTime, text: firstText, words: null };
  const secondSeg = { id: nextId(), start: splitTime, end: seg.end, text: secondText, speaker: seg.speaker, words: null };

  const segments = [...transcript.segments];
  segments.splice(idx, 1, firstSeg, secondSeg);
  return { ...transcript, segments };
}

export function searchTranscript(transcript, query) {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return transcript.segments.filter((s) => s.text.toLowerCase().includes(q)).map((s) => s.id);
}

export function findActiveSegment(transcript, currentTimeSeconds) {
  return transcript.segments.find((s) => currentTimeSeconds >= s.start && currentTimeSeconds < s.end) || null;
}

export function transcriptToPlainText(transcript) {
  return transcript.segments.map((s) => s.text).join('\n\n');
}
