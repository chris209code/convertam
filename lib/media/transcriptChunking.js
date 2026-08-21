// Pure chunk-planning and chunk-merge logic for transcription — deliberately
// dependency-free (no Web Audio, no fetch) so it's testable with plain
// Node.js and so the "how do chunks divide up the timeline" and "how do
// overlapping chunk transcripts recombine" math lives in one place, away
// from the browser-only audio decode/encode code (audioEncode.js) and the
// network orchestration (providers/geminiTranscription.js).

// Splits [0, totalDurationSeconds] into sequential windows of at most
// chunkSeconds each, with overlapSeconds shared between every consecutive
// pair — the overlap exists so a word spoken exactly on a chunk boundary
// gets a full, undamaged hearing in at least one chunk rather than being
// truncated mid-word in both. Audio at or under chunkSeconds always
// produces exactly one window covering the whole file — no split, no
// overlap, byte-for-byte the same request shape as the pre-chunking
// single-request path.
export function planTranscribeChunks(totalDurationSeconds, chunkSeconds, overlapSeconds) {
  if (!Number.isFinite(totalDurationSeconds) || totalDurationSeconds <= 0) return [];
  if (totalDurationSeconds <= chunkSeconds) {
    return [{ start: 0, end: totalDurationSeconds }];
  }
  const windows = [];
  let start = 0;
  while (start < totalDurationSeconds) {
    const end = Math.min(start + chunkSeconds, totalDurationSeconds);
    windows.push({ start, end });
    if (end >= totalDurationSeconds) break;
    start = end - overlapSeconds;
  }
  return windows;
}

// Combines each chunk's independently-transcribed segments (still in
// chunk-relative time) into one absolute-time segment list.
//
// chunkResults: [{ start, end, response }] — start/end are this chunk's
// position in the ORIGINAL audio (from planTranscribeChunks); response is
// the raw Gemini JSON for that chunk (TRANSCRIBE_SCHEMA shape).
//
// Two consecutive chunks both "hear" the shared overlap window and each
// produces its own (independently-worded, independently-timed) segments
// for it — naively concatenating would duplicate that stretch of speech.
// Ownership of the overlap is resolved purely by time: the midpoint of the
// overlap window becomes a hard cutover, and a segment is kept only if its
// (offset) start falls on its own chunk's side of that cutover. This is a
// deliberate, disclosed approximation (same honesty posture as
// transcript.js's splitSegment/captions.js's proportional-time-split) —
// never a fuzzy text comparison that could misfire and silently duplicate
// or drop real words. It means a segment can occasionally be "claimed" by
// a chunk that clipped it a little early or late relative to the actual
// word boundary, but it never invents, drops, or duplicates spoken words.
export function mergeChunkTranscripts(chunkResults, overlapSeconds) {
  const n = chunkResults.length;
  const segments = [];
  let language = null;

  chunkResults.forEach((chunk, i) => {
    const { start: chunkStart, end: chunkEnd, response } = chunk;
    if (!language && typeof response?.language === 'string' && response.language.trim()) {
      language = response.language.trim();
    }

    const lowerCutover = i === 0 ? -Infinity : chunkStart + overlapSeconds / 2;
    const upperCutover = i === n - 1 ? Infinity : chunkEnd - overlapSeconds / 2;

    const chunkSegments = Array.isArray(response?.segments) ? response.segments : [];
    chunkSegments.forEach((s) => {
      if (!s || typeof s.text !== 'string' || !Number.isFinite(s.start) || !Number.isFinite(s.end)) return;
      const absStart = chunkStart + s.start;
      const absEnd = chunkStart + s.end;
      if (absStart < lowerCutover || absStart >= upperCutover) return; // owned by the neighboring chunk instead
      segments.push({ start: absStart, end: absEnd, text: s.text });
    });
  });

  return { language, segments };
}

// Finds stretches of [0, totalDurationSeconds] with no transcript coverage
// at all, at least minGapSeconds long — the raw material for
// geminiTranscription.js's gap-fill pass. Deliberately doesn't know or care
// WHY a stretch is uncovered (a real silence, or Gemini genuinely losing
// track of a long continuous chunk) — that judgment belongs to the caller,
// which can check the actual audio for real signal before spending another
// Gemini call re-transcribing what might just be silence.
export function findCoverageGaps(segments, totalDurationSeconds, minGapSeconds) {
  if (!Number.isFinite(totalDurationSeconds) || totalDurationSeconds <= 0) return [];
  const sorted = [...segments].sort((a, b) => a.start - b.start);
  const gaps = [];
  let cursor = 0;
  sorted.forEach((s) => {
    if (s.start - cursor >= minGapSeconds) gaps.push({ start: cursor, end: s.start });
    cursor = Math.max(cursor, s.end);
  });
  if (totalDurationSeconds - cursor >= minGapSeconds) gaps.push({ start: cursor, end: totalDurationSeconds });
  return gaps;
}

// Defensive, non-mutating check run after a merge (and after
// normalizeTranscript's own clamping) — asserts the invariants chunked
// transcription must hold: never confirms them by construction alone,
// verifies them. Returns issues rather than throwing, so a caller can log
// and still use the (already-clamped) transcript rather than fail a whole
// transcription over a cosmetic edge case.
export function validateMergedTranscript(transcript, totalDurationSeconds) {
  const issues = [];
  const segments = transcript?.segments || [];
  for (let i = 0; i < segments.length; i++) {
    const s = segments[i];
    if (s.end < s.start) issues.push(`segment ${i} has end (${s.end}) before start (${s.start})`);
    if (Number.isFinite(totalDurationSeconds) && s.end > totalDurationSeconds + 0.5) {
      issues.push(`segment ${i} end (${s.end.toFixed(2)}s) exceeds audio duration (${totalDurationSeconds.toFixed(2)}s)`);
    }
    if (i > 0 && s.start < segments[i - 1].start - 0.01) {
      issues.push(`segment ${i} starts (${s.start.toFixed(2)}s) before segment ${i - 1} (${segments[i - 1].start.toFixed(2)}s) — not monotonically increasing`);
    }
  }
  return { valid: issues.length === 0, issues };
}
