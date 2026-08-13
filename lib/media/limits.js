// Media Workspace limits — same pattern as lib/documentTranslate/limits.js:
// shared between the client (reject early, before any real work starts)
// and the server (never trust the client-side check alone).
//
// TRANSCRIBE_* is the one genuinely hard constraint in this whole feature,
// and it's worth spelling out why the number is what it is rather than a
// round "10 minutes" that sounds nicer: /api/media-transcribe sends the
// audio to Gemini as base64 inside a single JSON request body, and this
// repo's serverless routes run as standard Vercel Node.js functions with
// no streaming-upload path — meaning the whole request body has to fit
// under Vercel's ~4.5MB per-request ceiling. Base64 inflates raw bytes by
// ~4/3, so the actual raw-audio budget is well under that. Sending audio
// downsampled to a speech-adequate 8kHz mono 16-bit PCM WAV (the same rate
// telephony/ASR systems use, plenty for transcription accuracy even though
// it wouldn't be pleasant to listen to as music) keeps ~1 minute of audio
// to roughly 1MB raw / ~1.3MB base64 — TRANSCRIBE_MAX_DURATION_SECONDS
// below is chosen to land safely inside that ceiling with real headroom
// for the JSON wrapper and prompt text, not picked for a round number.
export const TRANSCRIBE_MAX_DURATION_SECONDS = 180; // 3 minutes
export const TRANSCRIBE_SAMPLE_RATE = 8000;
export const TRANSCRIBE_MAX_RAW_BYTES = 3 * 1024 * 1024; // secondary guard alongside the duration cap

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
