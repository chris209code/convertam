'use client';

// The normalized transcription provider interface the spec asks for:
// transcribeMedia({ file }) -> a normalized transcript (see transcript.js).
// Today there is exactly one implementation (Gemini, via /api/media-
// transcribe), but every caller in the app goes through this function
// rather than talking to the route directly — swapping or adding a second
// provider later (a dedicated ASR API with real diarization/word
// timestamps, say) means changing this one file, not every call site.
//
// Audio longer than TRANSCRIBE_CHUNK_SECONDS is transcribed as several
// sequential, overlapping chunks (see transcriptChunking.js) and merged
// into one transcript before this function returns — from every caller's
// point of view, this is still exactly one transcription. Audio at or
// under TRANSCRIBE_CHUNK_SECONDS produces exactly one chunk and behaves
// byte-for-byte like the original, non-chunked implementation.

import { decodeAudioFile, sliceAndEncodeChunk } from '../audioEncode';
import { normalizeTranscript } from '../transcript';
import { mergeChunkTranscripts, planTranscribeChunks, validateMergedTranscript } from '../transcriptChunking';
import { TRANSCRIBE_SAMPLE_RATE, TRANSCRIBE_CHUNK_SECONDS, TRANSCRIBE_CHUNK_OVERLAP_SECONDS, validateTranscribeDuration } from '../limits';

export class TranscriptionError extends Error {
  constructor(message, category, extra) {
    super(message);
    this.category = category || 'unexpected';
    if (extra) Object.assign(this, extra);
  }
}

function generateActionId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `act-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function formatMinutesSeconds(seconds) {
  const total = Math.max(0, Math.round(seconds));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

// One request to /api/media-transcribe for one chunk's WAV. Identical
// contract to the original single-shot implementation, plus three small
// additive fields (chunkIndex/totalChunks/actionId) the server uses to
// separate "how many chunk calls" from "how many transcription actions"
// (see rateLimit.js) — always sent, even for a single-chunk transcription,
// so the server-side accounting is consistent regardless of file length.
async function transcribeChunk({ blob, durationSeconds, chunkIndex, totalChunks, actionId }) {
  const formData = new FormData();
  formData.append('audio', blob, 'audio.wav');
  formData.append('durationSeconds', String(durationSeconds));
  formData.append('chunkIndex', String(chunkIndex));
  formData.append('totalChunks', String(totalChunks));
  formData.append('actionId', actionId);

  let res;
  try {
    res = await fetch('/api/media-transcribe', { method: 'POST', body: formData });
  } catch {
    throw new TranscriptionError('Could not reach the transcription service. Check your connection and try again.', 'transient');
  }

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new TranscriptionError(data?.error || 'Transcription failed. Please try again.', data?.category || 'unexpected', { retryAfterSeconds: data?.retryAfterSeconds });
  }
  return data; // raw { language, duration, segments } for just this chunk
}

// Retries exactly once — mirrors callGemini's own bounded-retry posture on
// the server. A rate-limit/quota response is not retried, since retrying
// straight into an exhausted budget only spends more of it for no benefit.
async function transcribeChunkWithRetry(args) {
  try {
    return await transcribeChunk(args);
  } catch (err) {
    if (err.category === 'rate_limit' || err.category === 'quota_exhausted') throw err;
    return await transcribeChunk(args);
  }
}

// `file` may be any audio or video File the browser can decode — video
// files have their audio track decoded the same way audio extraction does
// (see audioEncode.js), so a caller never needs to extract audio first.
//
// onStatus(phase, detail) is called at each stage:
//   'preparing'    — decoding/validating the file, detail: {}
//   'transcribing' — one chunk in flight, detail: { chunkIndex, totalChunks }
//   'merging'      — combining chunk transcripts, detail: {}
//   'done'         — finished, detail: {}
export async function transcribeMedia({ file, onStatus }) {
  onStatus?.('preparing', {});
  let audioBuffer;
  try {
    audioBuffer = await decodeAudioFile(file);
  } catch (err) {
    throw new TranscriptionError(err.message || 'Could not read this file\'s audio.', 'invalid_file');
  }

  const durationSeconds = audioBuffer.duration;
  const durationError = validateTranscribeDuration(durationSeconds);
  if (durationError) throw new TranscriptionError(durationError, 'invalid_request');

  const windows = planTranscribeChunks(durationSeconds, TRANSCRIBE_CHUNK_SECONDS, TRANSCRIBE_CHUNK_OVERLAP_SECONDS);
  const actionId = generateActionId();
  const chunkResults = [];

  // Sequential, not parallel — parallel chunk requests would exhaust the
  // per-hour chunk-call budget and the circuit breaker's rapid-429
  // threshold almost immediately for any file needing more than a couple
  // chunks, for no real speed benefit worth that cost.
  for (let i = 0; i < windows.length; i++) {
    const { start, end } = windows[i];
    onStatus?.('transcribing', { chunkIndex: i, totalChunks: windows.length });

    let blob;
    try {
      ({ blob } = await sliceAndEncodeChunk(audioBuffer, start, end, TRANSCRIBE_SAMPLE_RATE));
    } catch (err) {
      throw new TranscriptionError(err.message || 'Could not prepare this audio for transcription.', 'invalid_file');
    }

    let response;
    try {
      response = await transcribeChunkWithRetry({ blob, durationSeconds: end - start, chunkIndex: i, totalChunks: windows.length, actionId });
    } catch (err) {
      // Chunks already transcribed are never discarded — merge whatever
      // succeeded so far and attach it to the error, even though today's
      // UI shows the error rather than the partial result (see
      // AudioStudioWorkspace/VideoStudioWorkspace) — a future caller can
      // use it without redoing already-spent chunk-call budget.
      const partialTranscript = chunkResults.length
        ? normalizeTranscript({ ...mergeChunkTranscripts(chunkResults, TRANSCRIBE_CHUNK_OVERLAP_SECONDS), duration: durationSeconds })
        : null;
      const rangeLabel = `${formatMinutesSeconds(start)}–${formatMinutesSeconds(end)}`;
      const message = windows.length > 1
        ? `Transcription failed while processing ${rangeLabel} (part ${i + 1} of ${windows.length}) of this audio. ${err.message || 'Please try again.'}`
        : (err.message || 'Transcription failed. Please try again.');
      throw new TranscriptionError(message, err.category || 'unexpected', { partialTranscript, failedChunkIndex: i, totalChunks: windows.length, retryAfterSeconds: err.retryAfterSeconds });
    }

    chunkResults.push({ start, end, response });
    // Drop the reference so this chunk's (already-uploaded) WAV Blob is
    // free to be garbage-collected before the next chunk is encoded —
    // only one chunk's audio is ever held in memory at a time beyond the
    // one full decoded AudioBuffer every upload already requires today.
    blob = null;
  }

  onStatus?.('merging', {});
  const merged = mergeChunkTranscripts(chunkResults, TRANSCRIBE_CHUNK_OVERLAP_SECONDS);
  const transcript = normalizeTranscript({ ...merged, duration: durationSeconds });

  const validation = validateMergedTranscript(transcript, durationSeconds);
  if (!validation.valid) {
    console.warn('Merged transcript failed post-merge validation (using it anyway, already clamped by normalizeTranscript):', validation.issues);
  }

  onStatus?.('done', {});
  return transcript;
}
