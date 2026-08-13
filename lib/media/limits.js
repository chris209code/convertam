// Media Workspace limits — same pattern as lib/documentTranslate/limits.js:
// shared between the client (reject early, before any real work starts)
// and the server (never trust the client-side check alone).
//
// TRANSCRIBE_CHUNK_SECONDS is the one genuinely hard technical constraint in
// this whole feature, and it's worth spelling out why the number is what it
// is: each individual request to /api/media-transcribe carries its audio as
// a raw WAV in a multipart FormData body, and this repo's serverless routes
// run as standard Vercel Node.js functions with no streaming-upload path —
// meaning the whole request body has to fit under Vercel's ~4.5MB
// per-request ceiling. Sending audio downsampled to a speech-adequate 8kHz
// mono 16-bit PCM WAV (the same rate telephony/ASR systems use, plenty for
// transcription accuracy even though it wouldn't be pleasant to listen to
// as music) keeps ~1 minute of audio to roughly 1MB raw — 180s of audio is
// ~2.74MB, safely inside that ceiling with real headroom for multipart
// overhead. This was the entire product's transcription limit before
// chunking existed; now it's just the size of one chunk.
//
// TRANSCRIBE_MAX_DURATION_SECONDS is the product-level ceiling on top of
// that: audio longer than one chunk is automatically split into sequential
// TRANSCRIBE_CHUNK_SECONDS-long chunks (client-side, with a small overlap —
// see lib/media/transcriptChunking.js), each sent through the exact same
// per-chunk-safe request as before, and the per-chunk transcripts are
// merged back into one timestamp-continuous transcript. Gemini itself was
// never the constraint here (its own request-size ceiling is far larger
// than anything this product sends) — this cap exists to bound real cost
// (each chunk is a billed Gemini call) and total wall-clock time for one
// click, not because longer audio is technically impossible to chunk
// further. 15 minutes ≈ 5 sequential chunk calls per transcription — a
// deliberately chosen, still-finite product limit, not a technical wall.
export const TRANSCRIBE_CHUNK_SECONDS = 180; // 3 minutes — see comment above
export const TRANSCRIBE_CHUNK_OVERLAP_SECONDS = 3; // shared window between consecutive chunks, so a word split exactly on a chunk boundary isn't silently lost — see transcriptChunking.js's merge logic for how the overlap is de-duplicated
export const TRANSCRIBE_MAX_DURATION_SECONDS = 15 * 60; // 15 minutes — product limit, see comment above
export const TRANSCRIBE_SAMPLE_RATE = 8000;
export const TRANSCRIBE_MAX_RAW_BYTES = 3 * 1024 * 1024; // per-chunk guard alongside TRANSCRIBE_CHUNK_SECONDS

// Upload-time ceilings are much more generous than the transcription cap
// above, since playback/metadata/waveform/audio-extraction/caption-burn are
// all local browser work with no request-body constraint — only the
// "Transcribe" action itself is bounded by TRANSCRIBE_MAX_DURATION_SECONDS.
export const MAX_UPLOAD_AUDIO_BYTES = 200 * 1024 * 1024; // 200MB
export const MAX_UPLOAD_VIDEO_BYTES = 500 * 1024 * 1024; // 500MB
export const MAX_UPLOAD_IMAGE_BYTES = 25 * 1024 * 1024; // 25MB — a static overlay image never needs to be anywhere near video-sized

// ffmpeg.wasm render operations (burn-in, audiogram/captioned-video) run
// entirely on the user's own device — bounded here to keep worst-case
// mobile-device stress reasonable, not for cost reasons (rendering is free
// server-side, since it never reaches a server at all).
export const MAX_RENDER_DURATION_SECONDS = 20 * 60; // 20 minutes
export const MAX_RENDER_VIDEO_WIDTH = 1920;
export const MAX_RENDER_VIDEO_HEIGHT = 1920;

function mb(bytes) { return Math.round(bytes / (1024 * 1024)); }
function mmss(seconds) {
  const total = Math.round(seconds);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return s ? `${m}m ${s}s` : `${m} minute${m === 1 ? '' : 's'}`;
}

const UPLOAD_LIMIT_LABEL = { video: 'video', audio: 'audio', image: 'image' };

export function validateUploadSize(file, kind) {
  const max = kind === 'video' ? MAX_UPLOAD_VIDEO_BYTES : kind === 'image' ? MAX_UPLOAD_IMAGE_BYTES : MAX_UPLOAD_AUDIO_BYTES;
  if (file.size > max) {
    return `This ${UPLOAD_LIMIT_LABEL[kind] || 'file'} is larger than the current ${mb(max)}MB limit.`;
  }
  return null;
}

// Called with a real, measured duration (from metadata.js) — never guessed
// from file size, since bitrate varies too much for that to be reliable.
export function validateTranscribeDuration(durationSeconds) {
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    return 'Could not determine this file\'s duration — try a different file.';
  }
  if (durationSeconds > TRANSCRIBE_MAX_DURATION_SECONDS) {
    return `This version of Convertam transcribes clips up to ${mmss(TRANSCRIBE_MAX_DURATION_SECONDS)}. This file is ${mmss(durationSeconds)} — please trim it and try again.`;
  }
  return null;
}

// Server-side guard for ONE chunk request, not the whole file — the client
// enforces TRANSCRIBE_MAX_DURATION_SECONDS against the *total* file
// duration before it ever starts chunking (see
// providers/geminiTranscription.js), but /api/media-transcribe only ever
// sees one chunk's audio at a time and must never trust that the caller
// actually respected the chunk-size contract. A small tolerance absorbs
// floating-point rounding in the client's chunk-boundary math — it is not
// a loophole for sending whole, unchunked long files, since it's barely
// larger than TRANSCRIBE_CHUNK_SECONDS itself.
const TRANSCRIBE_CHUNK_DURATION_TOLERANCE_SECONDS = 2;

export function validateTranscribeChunkDuration(durationSeconds) {
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    return 'Could not determine this audio chunk\'s duration.';
  }
  if (durationSeconds > TRANSCRIBE_CHUNK_SECONDS + TRANSCRIBE_CHUNK_DURATION_TOLERANCE_SECONDS) {
    return 'This audio chunk is longer than this server expects. Please try transcribing again.';
  }
  return null;
}

export function validateRenderDuration(durationSeconds) {
  if (durationSeconds > MAX_RENDER_DURATION_SECONDS) {
    return `This version supports rendering clips up to ${mmss(MAX_RENDER_DURATION_SECONDS)}. This file is ${mmss(durationSeconds)} — please trim it and try again.`;
  }
  return null;
}

// Caption burn-in keeps the source video's own resolution (no re-encode to
// a different size) — bounded here so an unusually high-resolution upload
// doesn't push a low-memory phone's browser tab to crash mid-render.
export function validateRenderDimensions(width, height) {
  if (width > MAX_RENDER_VIDEO_WIDTH || height > MAX_RENDER_VIDEO_HEIGHT) {
    return `This version supports burning captions into video up to ${MAX_RENDER_VIDEO_WIDTH}×${MAX_RENDER_VIDEO_HEIGHT}. This video is ${width}×${height} — please use a smaller resolution.`;
  }
  return null;
}
